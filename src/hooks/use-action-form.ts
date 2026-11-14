"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Seperti `useActionState`, tetapi form TIDAK dikosongkan otomatis.
 *
 * React 19 mereset form uncontrolled setelah setiap `<form action={…}>`
 * selesai — termasuk saat aksi mengembalikan pesan validasi — sehingga
 * pengguna harus mengetik ulang semuanya. Dengan `onSubmit` ini isian tetap
 * ada; form yang perlu dikosongkan setelah berhasil melakukannya sendiri.
 */
export function useActionForm<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(action, initialState);
  const [, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter instanceof HTMLElement ? submitter : undefined);
    startTransition(() => dispatch(formData));
  };

  return [state, onSubmit, pending] as const;
}
