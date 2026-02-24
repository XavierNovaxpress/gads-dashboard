export interface AccountConfig {
  label: string;
  cid: string;
  gname: string | null;
  group: string;
}

export const ACCOUNTS: AccountConfig[] = [
  { label: "Ondoxa", cid: "538-843-2933", gname: "Ondoxa - FollowTrust", group: "Ondoxa" },
  { label: "Liremia", cid: "879-213-2523", gname: "Liremia - tracking-colis", group: "Liremia" },
  { label: "PDF Time", cid: "418-589-6439", gname: "Liremia - PDF Time Feb 2025", group: "Liremia" },
  { label: "Umami (PDFZEN)", cid: "970-479-7817", gname: null, group: "Groupe Umami / Seablue" },
  { label: "Headsy", cid: "102-410-8242", gname: "Umami - Headsy", group: "Groupe Umami / Seablue" },
  { label: "QUICK PDF", cid: "674-378-2688", gname: null, group: "Groupe Umami / Seablue" },
  { label: "Seablue (IQBOOST)", cid: "563-992-0629", gname: "UMAMI (SEABLUE) - IQBOOST", group: "Groupe Umami / Seablue" },
  { label: "Seablue (IQMIND)", cid: "616-596-7617", gname: null, group: "Groupe Umami / Seablue" },
  { label: "Wizorg (Reco24)", cid: "501-362-3603", gname: null, group: "Groupe Wizorg" },
  { label: "WHOCALL", cid: "483-240-5874", gname: null, group: "Groupe Wizorg" },
  { label: "FACTEUR24", cid: "320-949-8699", gname: "Wizorg - FACTEUR24", group: "Groupe Wizorg" },
  { label: "Passfly", cid: "990-388-1347", gname: "Wizorg - Passfly", group: "Groupe Wizorg" },
  { label: "Recoline", cid: "514-224-7125", gname: null, group: "Groupe Wizorg" },
  { label: "Willow Luxe (REHYPE)", cid: "245-381-9845", gname: "Willow - REHYPE.ME", group: "Autres" },
  { label: "Cellopop (Talkto)", cid: "769-318-5388", gname: "Cellopop - Talkto", group: "Autres" },
  { label: "Clickbuster (Psona)", cid: "352-662-1890", gname: null, group: "Autres" },
  { label: "Clickbuster (Psona New)", cid: "130-570-5650", gname: null, group: "Autres" },
  { label: "NordDigital (DataOpp)", cid: "408-101-7666", gname: null, group: "Autres" },
];

export const GROUP_ORDER = ["Ondoxa", "Liremia", "Groupe Umami / Seablue", "Groupe Wizorg", "Autres"];

export const GROUP_COLORS: Record<string, string> = {
  "Ondoxa": "#EC5760",
  "Liremia": "#8b5cf6",
  "Groupe Umami / Seablue": "#06b6d4",
  "Groupe Wizorg": "#f59e0b",
  "Autres": "#ef4444",
};

export function getAccountByGname(gname: string): AccountConfig | undefined {
  return ACCOUNTS.find((a) => a.gname === gname);
}

export function getLabel(gname: string): string {
  const acct = getAccountByGname(gname);
  return acct ? acct.label : gname;
}

export function getGroup(gname: string): string {
  const acct = getAccountByGname(gname);
  return acct ? acct.group : "Autres";
}

export const FEE_RATE = 0.05;
