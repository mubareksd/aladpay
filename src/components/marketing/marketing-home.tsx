import { MarketingCta } from "@/components/marketing/marketing-cta";
import { panelClass } from "@/lib/ui-classes";

const HIGHLIGHTS = [
  {
    title: "Payment QR codes",
    body: "Static ETB QRs for Ethiopian banks and wallets — open or fixed amount, saved accounts, import from photo.",
  },
  {
    title: "Verify & checkout",
    body: "Confirm customer transfers and start hosted checkout when your server API is configured.",
  },
  {
    title: "Restaurant POS",
    body: "Tables, kitchen queue, guest ordering by QR, daily reports, and team access per company.",
  },
  {
    title: "Built for operators",
    body: "Register a company, invite staff with secure links, and run kitchen display on a tablet.",
  },
] as const;

export function MarketingHome() {
  return (
    <>
      <section className="py-12 sm:py-16 md:py-20">
        <p className="text-sm font-medium text-brand">Ethiopia · ETB</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
          Payment QR and restaurant POS in one place
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          AladPay helps cafes and businesses accept bank transfers with scannable QRs, verify payments,
          and run tables, kitchen, and guest menus — without a separate POS vendor lock-in.
        </p>
        <div className="mt-8">
          <MarketingCta />
        </div>
      </section>

      <section id="product" className="scroll-mt-20 border-t border-border py-12 sm:py-16">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">What you get</h2>
        <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
          Everything runs in the browser for QR generation; optional cloud sign-in stores guest orders and
          team data in your database.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className={panelClass}>
              <h3 className="text-base font-medium text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border py-12 sm:py-16">
        <div className={`${panelClass} bg-brand-soft/40 text-center sm:text-left`}>
          <h2 className="text-lg font-semibold text-foreground">Ready to run your floor?</h2>
          <p className="mt-2 text-sm text-muted">
            Create a company account, publish your guest menu, and print table QRs for customers to order
            from their phones.
          </p>
          <div className="mt-6 flex justify-center sm:justify-start">
            <MarketingCta />
          </div>
        </div>
      </section>
    </>
  );
}
