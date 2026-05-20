export type Note = {
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  content: string;
};

export type PerfumeSize = {
  label: string;
  ml: number;
  price: number;
};

export type PerfumeDiscountMode = "percent" | "fixed";

export type PerfumeDiscountScope =
  | {
      kind: "all";
    }
  | {
      kind: "size";
      ml: number;
    }
  | {
      kind: "custom";
      mls: number[];
    };

export type PerfumeDiscountDeadline =
  | {
      kind: "none";
    }
  | {
      kind: "date";
      endsOn: string;
    }
  | {
      kind: "duration";
      unit: "days" | "weeks" | "months";
      amount: number;
      startsOn: string;
      endsOn: string;
    }
  | {
      kind: "endOfMonth";
    };

export type PerfumeDiscount = {
  enabled: boolean;
  mode: PerfumeDiscountMode;
  value: number;
  scope: PerfumeDiscountScope;
  deadline: PerfumeDiscountDeadline;
  showDeadline?: boolean;
};

export type Perfume = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  image: string;
  imageAlt: string;
  stockStatus: string;
  inStock: boolean;
  externalLink: string;
  sizes: PerfumeSize[];
  discount?: PerfumeDiscount;
  noteSlugs: {
    top: string[];
    heart: string[];
    base: string[];
  };
};

export type PerfumeWithNotes = Perfume & {
  notes: {
    top: Note[];
    heart: Note[];
    base: Note[];
  };
};
