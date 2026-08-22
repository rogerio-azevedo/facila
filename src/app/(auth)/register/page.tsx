import { RegisterForm } from "@/components/auth/register-form";

const notices: Record<string, string> = {
  "google-new-user":
    "Conta Google não encontrada. Cadastre sua empresa abaixo antes de usar o Google.",
  "no-company": "Sua conta existe, mas não está vinculada a nenhuma empresa. Complete o cadastro.",
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const notice = params.error ? notices[params.error] : undefined;

  return <RegisterForm notice={notice} />;
}
