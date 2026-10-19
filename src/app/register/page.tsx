import { MarketingShell } from "@/components/marketing/marketing-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <MarketingShell narrow>
      <RegisterForm />
    </MarketingShell>
  );
}
