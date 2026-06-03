import type { Locale } from "@/lib/i18n";

const NOTE_NAME_AZ_MAP: Record<string, string> = {
  oud: "Ud",
  amber: "Ənbər",
  musk: "Müşk",
  bergamot: "Berqamot",
  lemon: "Limon",
  jasmine: "Yasəmən",
  rose: "Qızılgül",
  cedar: "Sidr",
  sandalwood: "Səndəl ağacı",
  vanilla: "Vanil",
  patchouli: "Paçuli",
  vetiver: "Vetiver",
  tobacco: "Tütün",
  incense: "Buxur",
  leather: "Dəri",
  lavender: "Lavanda",
  neroli: "Neroli",
  peony: "Pion",
  iris: "İris",
  violet: "Bənövşə",
  grapefruit: "Qreypfrut",
  mandarin: "Mandarin",
  marine: "Dəniz notu",
  aquatic: "Su notu",
  cinnamon: "Darçın",
  tonka: "Tonka",
  benzoin: "Benzoe",
  pear: "Armud",
  armud: "Armud",
  rum: "Rom",
  rom: "Rom",
  "violet-leaf": "Bənövşə yarpağı",
  "bnv-yarpa": "Bənövşə yarpağı",
  "bnv yarpa": "Bənövşə yarpağı",
  "benovse-yarpagi": "Bənövşə yarpağı",
  "benovse yarpagi": "Bənövşə yarpağı",
  "bənövşə-yarpağı": "Bənövşə yarpağı",
  "bənövşə yarpağı": "Bənövşə yarpağı",
  "bulgarian-rose": "Bolqar qızılgülü",
  "bolqar-qzlgl": "Bolqar qızılgülü",
  "bolqar qzlgl": "Bolqar qızılgülü",
  "bolqar-qizilgul": "Bolqar qızılgülü",
  "bolqar qizilgul": "Bolqar qızılgülü",
  orange: "Portağal",
  "orange-blossom": "Portağal çiçəyi",
  "portaal-iyi": "Portağal iyi",
  "portaal iyi": "Portağal iyi",
  "portagal-iyi": "Portağal iyi",
  "portagal iyi": "Portağal iyi",
  "portağal-iyi": "Portağal iyi",
  "portağal iyi": "Portağal iyi",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function humanizeNoteToken(value: string) {
  return value
    .split("-")
    .map((part) => (part ? `${part[0]?.toUpperCase() || ""}${part.slice(1)}` : part))
    .join(" ");
}

export function localizeNoteLabel(input: { slug?: string; name?: string }, locale: Locale) {
  const slug = normalize(input.slug || "");
  const name = (input.name || "").trim();

  if (locale !== "az") {
    return name || humanizeNoteToken(slug);
  }

  return (
    NOTE_NAME_AZ_MAP[slug] ||
    NOTE_NAME_AZ_MAP[normalize(name)] ||
    name ||
    humanizeNoteToken(slug)
  );
}
