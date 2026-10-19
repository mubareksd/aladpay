import type { YayaTag62Encoding } from "@/lib/ethiopian-bank-qr";

export type AmountMode = "any" | "fixed";

export type PaymentQrFormState = {
  bankBic: string;
  account: string;
  name: string;
  amount: string;
  amountMode: AmountMode;
  remark: string;
  phone: string;
  till: string;
  city: string;
  encoding: "ips" | "legacy";
  merchantGuid: string;
  yayaUsername: string;
  yayaTag62Encoding: YayaTag62Encoding;
};

export const defaultPaymentQrForm: PaymentQrFormState = {
  bankBic: "ABYSETAA",
  account: "",
  name: "",
  amount: "",
  amountMode: "any",
  remark: "",
  phone: "",
  till: "",
  city: "ADDIS ABABA",
  encoding: "ips",
  merchantGuid: "",
  yayaUsername: "",
  yayaTag62Encoding: "standard",
};
