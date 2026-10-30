/**
 * VynoraApp — Video Data & Team Configuration
 * Developed by Kelompok ARENA
 */

export const teamData = {
  groupName: "ARENA",
  appName: "VynoraApp",
  tagline: "Your Visual World, One Tap Away.",
  course: "Tugas UTS Pemrograman Mobile / Web Multimedia",
  description: "Aplikasi mobile video player modern bergaya GoTube yang memadukan logika pemutar musik ke dalam ekosistem video player dengan fitur lengkap.",
  members: [
    {
      id: 1,
      name: "DANIL",
      role: "Anggota Kelompok",
      photo: "/team/danil.jpg?v=2"
    },
    {
      id: 2,
      name: "Salsabil Diramadhan",
      role: "Anggota Kelompok",
      photo: "/team/salsabil.jpg?v=2"
    },
    {
      id: 3,
      name: "Ahmad Faozi",
      role: "Anggota Kelompok",
      photo: "/team/ahmad.jpg?v=2"
    },
    {
      id: 4,
      name: "Kemal Hidayat",
      role: "Anggota Kelompok",
      photo: "/team/kemal.jpg?v=2"
    },
    {
      id: 5,
      name: "Natasya Dwinovita",
      role: "Anggota Kelompok",
      photo: "/team/natasya.jpg?v=2"
    },
    {
      id: 6,
      name: "Pelis Saputri",
      role: "Anggota Kelompok",
      photo: "/team/pelis.jpg?v=2"
    }
  ]
};

export const initialPlaylist = [
  {
    id: "tiktok-1",
    type: "tiktok",
    title: "Video TikTok 1",
    channel: "@diramadhansalsabi",
    views: "TikTok",
    date: "Video",
    likes: "—",
    category: "tiktok",
    contentCategory: "lainnya",
    caption: "Video promosi dari TikTok.",
    tiktokId: "7692626208797789447",
    sourceUrl: "https://vt.tiktok.com/ZSgpUakdV/",
    thumbnail: "/covers/tiktok-1-cover.png",
    avatar: "/covers/tiktok-1-cover.png",
    description: "Video TikTok dari tautan yang diberikan."
  },
  {
    id: "tiktok-2",
    type: "tiktok",
    title: "Video TikTok 2",
    channel: "@diramadhansalsabi",
    views: "TikTok",
    date: "Video",
    likes: "—",
    category: "tiktok",
    contentCategory: "lainnya",
    caption: "Video promosi dari TikTok.",
    tiktokId: "7690145828324887815",
    sourceUrl: "https://vt.tiktok.com/ZSgp583AS/",
    thumbnail: "/covers/tiktok-2-cover.png",
    avatar: "/covers/tiktok-2-cover.png",
    description: "Video TikTok dari tautan yang diberikan."
  },
  {
    id: "2c30a4fe-5d6a-4a76-9d8a-c3e9b45cac41",
    type: "youtube",
    title: "Menelusuri Jejak Sejarah Kota Kendari",
    channel: "Abil Ramadhan",
    views: "YouTube",
    date: "Video",
    likes: "—",
    category: "youtube",
    contentCategory: "lainnya",
    caption: "Sejarah dari Baterai Mata Hingga Sekolah Cina",
    videoId: "_VkhLqWsln4",
    youtubeId: "_VkhLqWsln4",
    embedUrl: "https://www.youtube-nocookie.com/embed/_VkhLqWsln4?playsinline=1&rel=0",
    sourceUrl: "https://youtu.be/_VkhLqWsln4",
    thumbnail: "https://i.ytimg.com/vi/_VkhLqWsln4/hqdefault.jpg",
    avatar: "/vynora-mark.png",
    description: "Video YouTube yang ditambahkan oleh pengunjung."
  },
  {
    id: "local-video-1",
    type: "mp4",
    title: "Video WhatsApp",
    channel: "Video Lokal",
    views: "Video lokal",
    date: "MP4",
    likes: "—",
    category: "local",
    contentCategory: "lainnya",
    caption: "Video lokal yang dibagikan oleh Kelompok ARENA.",
    src: "/videos/whatsapp-video-2026-10-28.mp4",
    thumbnail: "/covers/whatsapp-video-cover.png",
    avatar: "/logo.jpg",
    description: "Video MP4 yang ditambahkan dari file WhatsApp."
  }
];

export const defaultSettings = {
  autoplayNext: true,
  repeatPlaylist: true,
  defaultVolume: 0.8
};
