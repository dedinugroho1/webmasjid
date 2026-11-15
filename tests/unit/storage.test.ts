import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bunnyConfig, deleteFolder, deleteImage, uploadImage } from "@/lib/storage";

const ENV = {
  BUNNY_STORAGE_ZONE: "webmasjid",
  BUNNY_STORAGE_PASSWORD: "rahasia-zone",
  BUNNY_STORAGE_REGION: "sg",
  BUNNY_CDN_URL: "webmasjid.b-cdn.net/",
};

const png = (size = 10, type = "image/png") => new File([new Uint8Array(size)], "x.png", { type });
const form = (file: File) => {
  const f = new FormData();
  f.set("image", file);
  return f.get("image");
};

describe("bunnyConfig", () => {
  it("null bila belum lengkap", () => {
    expect(bunnyConfig({})).toBeNull();
    expect(bunnyConfig({ ...ENV, BUNNY_CDN_URL: "" })).toBeNull();
    expect(bunnyConfig({ ...ENV, BUNNY_STORAGE_PASSWORD: " " })).toBeNull();
  });

  it("memilih host sesuai region dan merapikan URL publik", () => {
    expect(bunnyConfig(ENV)).toEqual({
      zone: "webmasjid",
      accessKey: "rahasia-zone",
      origin: "https://sg.storage.bunnycdn.com",
      publicUrl: "https://webmasjid.b-cdn.net",
    });
    expect(bunnyConfig({ ...ENV, BUNNY_STORAGE_REGION: "" })?.origin).toBe("https://storage.bunnycdn.com");
    expect(bunnyConfig({ ...ENV, BUNNY_STORAGE_REGION: "tidak-ada" })?.origin).toBe("https://storage.bunnycdn.com");
    expect(bunnyConfig({ ...ENV, BUNNY_STORAGE_ENDPOINT: "http://localhost:4010/" })?.origin).toBe("http://localhost:4010");
    expect(bunnyConfig({ ...ENV, BUNNY_CDN_URL: "https://cdn.masjid.id" })?.publicUrl).toBe("https://cdn.masjid.id");
  });
});

describe("uploadImage / deleteImage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const useBunny = () => Object.entries(ENV).forEach(([k, v]) => vi.stubEnv(k, v));

  it("tanpa Bunny: data URL, batas 300 KB, hanya gambar", async () => {
    const url = await uploadImage(form(png()), "t/logo");
    expect(url).toMatch(/^data:image\/png;base64,/);
    await expect(uploadImage(form(png(301 * 1024)), "t/logo")).rejects.toThrow(/300 KB/);
    await expect(uploadImage(form(png(10, "application/pdf")), "t/logo")).rejects.toThrow(/Format gambar/);
    expect(await uploadImage(null, "t/logo")).toBeNull();
    expect(await uploadImage(form(png(0)), "t/logo")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dengan Bunny: PUT ke storage region + AccessKey, URL publik lewat CDN", async () => {
    useBunny();
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const url = await uploadImage(form(png(2 * 1024 * 1024)), "tenant-1/gallery");

    expect(url).toMatch(/^https:\/\/webmasjid\.b-cdn\.net\/tenant-1\/gallery\/[0-9a-f-]{36}\.png$/);
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe(`https://sg.storage.bunnycdn.com/webmasjid/tenant-1/gallery/${url!.split("/").pop()}`);
    expect(init.method).toBe("PUT");
    expect(init.headers.AccessKey).toBe("rahasia-zone");
    expect(init.body.byteLength).toBe(2 * 1024 * 1024);
  });

  it("dengan Bunny: file > 4 MB ditolak; ekstensi mengikuti tipe", async () => {
    useBunny();
    await expect(uploadImage(form(png(5 * 1024 * 1024)), "t/x")).rejects.toThrow(/4 MB/);
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    expect(await uploadImage(form(png(10, "image/jpeg")), "t/x")).toMatch(/\.jpg$/);
    expect(await uploadImage(form(png(10, "image/webp")), "t/x")).toMatch(/\.webp$/);
  });

  it("dengan Bunny: error jelas untuk 401, kegagalan umum, dan jaringan", async () => {
    useBunny();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(uploadImage(form(png()), "t/x")).rejects.toThrow(/BUNNY_STORAGE_PASSWORD/);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(uploadImage(form(png()), "t/x")).rejects.toThrow(/Gagal mengunggah/);
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    await expect(uploadImage(form(png()), "t/x")).rejects.toThrow(/Tidak bisa menghubungi/);
    spy.mockRestore();
  });

  it("deleteImage: hanya URL milik CDN kita, tidak pernah melempar error", async () => {
    useBunny();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await deleteImage("https://webmasjid.b-cdn.net/tenant-1/gallery/a.png?v=2");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sg.storage.bunnycdn.com/webmasjid/tenant-1/gallery/a.png",
      expect.objectContaining({ method: "DELETE", headers: { AccessKey: "rahasia-zone" } }),
    );

    fetchMock.mockClear();
    await deleteImage("data:image/png;base64,AAAA");
    await deleteImage("https://orang-lain.com/a.png");
    await deleteImage("https://webmasjid.b-cdn.net/../rahasia.png");
    await deleteImage("https://webmasjid.b-cdn.net.evil.com/a.png");
    await deleteImage(null);
    expect(fetchMock).not.toHaveBeenCalled();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    await expect(deleteImage("https://webmasjid.b-cdn.net/t/a.png")).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("deleteImage: tanpa Bunny tidak melakukan apa pun", async () => {
    await deleteImage("https://webmasjid.b-cdn.net/t/a.png");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deleteFolder: hapus rekursif dengan garis miring di akhir; awalan berbahaya ditolak", async () => {
    useBunny();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    expect(await deleteFolder("89c0b05c-0f1b-422f-9241-99ad7889cc6f")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sg.storage.bunnycdn.com/webmasjid/89c0b05c-0f1b-422f-9241-99ad7889cc6f/",
      expect.objectContaining({ method: "DELETE" }),
    );

    fetchMock.mockClear();
    for (const bad of ["", "/", "../x", "a/../b", "a b", "*"]) expect(await deleteFolder(bad)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await deleteFolder("tenant-lama")).toBe(true); // sudah tidak ada
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await deleteFolder("tenant-x")).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await deleteFolder("tenant-x")).toBe(false);
    spy.mockRestore();
  });

  it("deleteFolder: tanpa Bunny dianggap sukses tanpa memanggil apa pun", async () => {
    expect(await deleteFolder("tenant-x")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
