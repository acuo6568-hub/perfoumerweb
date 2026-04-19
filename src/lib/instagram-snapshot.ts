export type InstagramSnapshotItem = {
  id: string;
  src: string;
  href: string;
  alt: string;
};

export const instagramSnapshot = {
  username: "perfoumer",
  profileUrl: "https://www.instagram.com/perfoumer/",
  updatedAt: "2026-04-19T05:56:31.401Z",
  items: [
    {
      id: "3858460218581927960",
      src: "/instagram/perfoumer-01.jpg",
      href: "https://www.instagram.com/p/DWMASA0jUgY/",
      alt: "Qoxunuzu bizimlə kəşf edin",
    },
    {
      id: "3759323477120460217",
      src: "/instagram/perfoumer-02.jpg",
      href: "https://www.instagram.com/p/DQrzMjhjSW5/",
      alt: "Xanımların şirin çiyələk qoxusu",
    },
    {
      id: "3761499257590093141",
      src: "/instagram/perfoumer-03.jpg",
      href: "https://www.instagram.com/p/DQzh6U_jZVV/",
      alt: "Portağalın başdan çıxardıcı sitrus qoxusu",
    },
    {
      id: "3865174694551253928",
      src: "/instagram/perfoumer-04.jpg",
      href: "https://www.instagram.com/p/DWj2-f3jnOo/",
      alt: "Jo Malone brendinin ən gözəl parfümləri",
    },
    {
      id: "3861551084263587240",
      src: "/instagram/perfoumer-05.jpg",
      href: "https://www.instagram.com/p/DWW_EBzjj2o/",
      alt: "Bəylər üçün ideal seçim",
    },
    {
      id: "3852009288064520027",
      src: "/instagram/perfoumer-06.jpg",
      href: "https://www.instagram.com/p/DV1Fgnml09b/",
      alt: "Tom Ford Lost Cherry",
    },
  ] as InstagramSnapshotItem[],
} as const;
