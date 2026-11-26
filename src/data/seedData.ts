import {
  FaqItem,
  GalleryItem,
  Program,
  ProgramLevel,
  RegistrationPeriod,
  SiteSettings,
  Tutor,
} from '../types/elite';

export const INITIAL_SITE_SETTINGS: Omit<SiteSettings, 'id'> = {
  brandName: 'ELITE COURSE',
  instituteFullName: 'ELITE — English Learning Institute',
  tagline: 'English Learning Institute · Pare, Kediri',
  logoUrl: '',
  heroHeadline: 'Kuasai Bahasa Inggris di Era Global Bersama ELITE Course',
  heroDescription:
    'ELITE dibangun berdasarkan pandangan unik tentang keadaan di era serba bahasa Inggris.',
  heroImageUrl: '/src/assets/images/hero_elite_campus_1795524909059.jpg',
  heroImageCaption: 'Ilustrasi suasana pembelajaran kelas (dapat diperbarui melalui Dashboard Admin)',
  heroPrimaryCtaText: 'Daftar Sekarang',
  foundedYear: '2019',
  fkbPermitNumber: '378/SR/PI/SK/FKB/II/2022',
  nibNumber: '220.6230.1583.22',
  visionItems: [
    'Meningkatkan sikap dan perilaku berakhlak mulia pada peserta didik.',
    'Mewujudkan lulusan yang cerdas, kompetitif dan memiliki jati diri.',
  ],
  missionItems: [
    'Terwujudnya putra dan putri didik yang beriman dan bertaqwa.',
    'Menumbuhkan siswa yang lebih aktif, kreatif dan disiplin.',
  ],
  advantages: [
    {
      title: 'Lembaga Diakui FKB',
      description:
        'ELITE berdiri sejak tahun 2019 dan memiliki nomor pendaftaran resmi FKB 378/SR/PI/SK/FKB/II/2022 serta NIB 220.6230.1583.22.',
    },
    {
      title: 'Instruktur Mumpuni',
      description:
        'Tutor memiliki kemampuan di bidangnya, ramah membimbing peserta, serta menjaga suasana kelas tetap menyenangkan.',
    },
    {
      title: 'Metode Super Asyik',
      description:
        'Menggunakan metode pembelajaran khas Kampung Inggris dengan pendekatan yang menyenangkan dan mudah dipahami.',
    },
  ],
  offlinePriceNote: '2 minggu (2 kelas)',
  onlineDescription: 'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta.',
  address: 'Jl. Aster, No. 02, Desa Tulungrejo, Kecamatan Pare, Kabupaten Kediri.',
  phone: '0856-5080-9091',
  whatsappNumber: '6285650809091',
  email: 'Elitekampunginggris@gmail.com',
  officeHours: 'Senin–Jumat, 08.00–17.00 WIB',
  socialLinks: [],
  isActive: true,
};

export const INITIAL_PROGRAMS: Array<{ id: string; data: Omit<Program, 'id'> }> = [
  {
    id: 'speaking-starter',
    data: {
      title: 'SPEAKING STARTER',
      slug: 'speaking-starter',
      category: 'offline',
      shortDescription:
        'Program dasar bahasa Inggris untuk membangun kosakata, pengucapan dasar, dan keberanian berbicara sejak hari pertama.',
      fullDescription:
        'Program Offline Class tingkat pemula dengan dua level (Pre Basic dan Up Basic) yang memadukan pengenalan kosakata, ekspresi harian, percakapan sekitar lingkungan, hingga grammar dasar.',
      basePrice: 200000,
      priceLabel: 'Rp200.000 / 2 minggu (2 kelas)',
      durationLabel: '2 minggu (2 kelas)',
      imageUrl: '/src/assets/images/gallery_speaking_club_1795524909062.jpg',
      isFeatured: true,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 1,
    },
  },
  {
    id: 'speaking-booster',
    data: {
      title: 'SPEAKING BOOSTER',
      slug: 'speaking-booster',
      category: 'offline',
      shortDescription:
        'Melatih kepercayaan diri berkomunikasi aktif dalam kelas kecil maupun besar, diskusi, presentasi, dan menyampaikan opini.',
      fullDescription:
        'Program Offline Class tingkat menengah (Pre Inter dan Up Inter) untuk melatih kepercayaan diri berbicara, berbagi pengalaman, beropini, dan menyampaikan solusi dalam bahasa Inggris.',
      basePrice: 200000,
      priceLabel: 'Rp200.000 / 2 minggu (2 kelas)',
      durationLabel: '2 minggu (2 kelas)',
      imageUrl: '/src/assets/images/hero_elite_campus_1795524909059.jpg',
      isFeatured: true,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 2,
    },
  },
  {
    id: 'ted-talk',
    data: {
      title: 'TED TALK',
      slug: 'ted-talk',
      category: 'offline',
      shortDescription:
        'Kelas diskusi kritis, debat, problem solving, dan tantangan speaking 99% bahasa Inggris untuk tingkat lanjutan.',
      fullDescription:
        'Program Offline Class tingkat lanjutan (Pre Advance dan Up Advance) yang berfokus pada mempertahankan pendapat, memperluas wawasan, dan membiasakan keberanian berbicara bahasa Inggris secara penuh.',
      basePrice: 150000,
      priceLabel: 'Rp150.000 / 2 minggu',
      durationLabel: '2 minggu',
      imageUrl: '/src/assets/images/gallery_public_speaking_1795524910552.jpg',
      isFeatured: true,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 3,
    },
  },
  {
    id: 'public-speaking',
    data: {
      title: 'PUBLIC SPEAKING',
      slug: 'public-speaking',
      category: 'offline',
      shortDescription:
        'Pelatihan berpidato dalam bahasa Inggris serta teknik body language dan penyusunan speeches untuk berbagai agenda.',
      fullDescription:
        'Melatih peserta berpidato dalam bahasa Inggris dan menguasai teknik body language serta penyusunan materi pidato untuk beragam keperluan acara.',
      basePrice: 150000,
      priceLabel: 'Rp150.000',
      durationLabel: '2 minggu (jadwal menunggu konfirmasi admin)',
      imageUrl: '/src/assets/images/gallery_public_speaking_1795524910552.jpg',
      isFeatured: true,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 4,
    },
  },
  {
    id: 'pte-offline',
    data: {
      title: 'PTE',
      slug: 'pte',
      category: 'offline',
      shortDescription:
        'Program persiapan PTE. Detail level, materi, tujuan, jadwal, tutor, dan durasi sedang menunggu kelengkapan data dari admin.',
      fullDescription:
        'Program PTE tercantum dengan biaya Rp1.050.000. Detail kurikulum, jadwal, dan tutor akan diaktifkan setelah dilengkapi oleh admin ELITE Course.',
      basePrice: 1050000,
      priceLabel: 'Rp1.050.000',
      durationLabel: 'Belum diatur admin',
      isFeatured: false,
      isDraftIncomplete: true,
      isActive: false,
      sortOrder: 5,
    },
  },
  {
    id: 'online-paket-1',
    data: {
      title: 'Paket 1 — 1 Tutor, 1 Murid',
      slug: 'online-paket-1',
      category: 'online',
      shortDescription:
        'Kelas privat intensif 1-on-1 secara online. Materi dan jadwal fleksibel sesuai kesepakatan di awal.',
      fullDescription:
        'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta. Materi dapat mencakup Grammar, Speaking, Pronunciation, atau materi lain sesuai kebutuhan peserta.',
      basePrice: 550000,
      priceLabel: 'Rp550.000 per siswa',
      durationLabel: '2 minggu (Senin–Jumat)',
      meetingCount: 10,
      durationPerMeetingMinutes: 60,
      tutorCount: 1,
      studentCapacity: 1,
      unitBillingMode: 'per_student',
      certificateIncluded: true,
      imageUrl: '/src/assets/images/gallery_online_mentoring_1795524911618.jpg',
      isFeatured: true,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 6,
    },
  },
  {
    id: 'online-paket-2',
    data: {
      title: 'Paket 2 — 1 Tutor, 2 Murid',
      slug: 'online-paket-2',
      category: 'online',
      shortDescription:
        'Kelas semi-privat untuk 2 peserta bersama 1 tutor. Cocok untuk belajar berpasangan dengan materi terarah.',
      fullDescription:
        'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta. Materi dapat mencakup Grammar, Speaking, Pronunciation, atau materi lain sesuai kebutuhan peserta.',
      basePrice: 350000,
      priceLabel: 'Rp350.000 per siswa',
      durationLabel: '2 minggu (Senin–Jumat)',
      meetingCount: 10,
      durationPerMeetingMinutes: 60,
      tutorCount: 1,
      studentCapacity: 2,
      unitBillingMode: 'per_student',
      certificateIncluded: true,
      imageUrl: '/src/assets/images/gallery_online_mentoring_1795524911618.jpg',
      isFeatured: false,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 7,
    },
  },
  {
    id: 'online-paket-3',
    data: {
      title: 'Paket 3 — 1 Tutor, 3 Murid',
      slug: 'online-paket-3',
      category: 'online',
      shortDescription:
        'Kelas kelompok kecil berisi 3 peserta bersama 1 tutor. 10 kali pertemuan berdurasi 60 menit.',
      fullDescription:
        'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta. Satuan biaya paket ini (per siswa / per paket) dapat dikonfirmasi dan diubah oleh admin.',
      basePrice: 300000,
      priceLabel: 'Rp300.000 (satuan biaya diatur admin)',
      durationLabel: '2 minggu (Senin–Jumat)',
      meetingCount: 10,
      durationPerMeetingMinutes: 60,
      tutorCount: 1,
      studentCapacity: 3,
      unitBillingMode: 'unconfirmed',
      certificateIncluded: true,
      imageUrl: '/src/assets/images/gallery_online_mentoring_1795524911618.jpg',
      isFeatured: false,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 8,
    },
  },
  {
    id: 'online-paket-4',
    data: {
      title: 'Paket 4 — 1 Tutor, 4 Murid',
      slug: 'online-paket-4',
      category: 'online',
      shortDescription:
        'Kelas kelompok 4 peserta bersama 1 tutor selama 2 minggu (Senin–Jumat). Mendapatkan sertifikat bahasa Inggris.',
      fullDescription:
        'Target pembelajaran disesuaikan dengan kebutuhan dan level peserta. Materi dapat mencakup Grammar, Speaking, Pronunciation, atau materi lain sesuai kebutuhan peserta.',
      basePrice: 250000,
      priceLabel: 'Rp250.000 per siswa',
      durationLabel: '2 minggu (Senin–Jumat)',
      meetingCount: 10,
      durationPerMeetingMinutes: 60,
      tutorCount: 1,
      studentCapacity: 4,
      unitBillingMode: 'per_student',
      certificateIncluded: true,
      imageUrl: '/src/assets/images/gallery_online_mentoring_1795524911618.jpg',
      isFeatured: false,
      isDraftIncomplete: false,
      isActive: true,
      sortOrder: 9,
    },
  },
];

export const INITIAL_PROGRAM_LEVELS: Array<{ id: string; data: Omit<ProgramLevel, 'id'> }> = [
  {
    id: 'starter-pre-basic',
    data: {
      programId: 'speaking-starter',
      name: 'Pre Basic',
      materialsSummary:
        'ABCs, vocabulary, hobbies, kalimat sederhana, angka, bulan, jam, presentasi sangat sederhana, lagu, dan pengenalan grammar dasar.',
      targetGoal:
        'Memberi pengenalan kepada pemula tentang bahasa Inggris dalam bentuk tulisan, video, dan audio.',
      scheduleSlot1: '07.00–08.30',
      tutorSlot1: 'Bro. A',
      scheduleSlot2: '08.30–10.00',
      tutorSlot2: 'Mr. B',
      price: 200000,
      durationLabel: '2 minggu (2 kelas)',
      isActive: true,
      sortOrder: 1,
    },
  },
  {
    id: 'starter-up-basic',
    data: {
      programId: 'speaking-starter',
      name: 'Up Basic',
      materialsSummary:
        'Vocabulary, expressions, percakapan sekitar lingkungan, describing benda dan seseorang, serta penggunaan grammar dari dasar.',
      targetGoal:
        'Mendorong siswa untuk segera melakukan percakapan dan membenahi cara pengucapan dasar.',
      scheduleSlot1: '07.00–08.30',
      tutorSlot1: 'Mr. B',
      scheduleSlot2: '08.30–10.00',
      tutorSlot2: 'Bro. A',
      price: 200000,
      durationLabel: '2 minggu (2 kelas)',
      isActive: true,
      sortOrder: 2,
    },
  },
  {
    id: 'booster-pre-inter',
    data: {
      programId: 'speaking-booster',
      name: 'Pre Inter',
      materialsSummary:
        'Feeling, cuaca, games, diskusi sederhana, lagu, listening, presentasi, dan materi terkait.',
      targetGoal:
        'Melatih siswa percaya diri dalam berkomunikasi baik dalam kelas kecil maupun besar.',
      scheduleSlot1: '10.00–11.30',
      tutorSlot1: 'Bro. A',
      scheduleSlot2: '13.30–15.00',
      tutorSlot2: 'Mr. B',
      price: 200000,
      durationLabel: '2 minggu (2 kelas)',
      isActive: true,
      sortOrder: 3,
    },
  },
  {
    id: 'booster-up-inter',
    data: {
      programId: 'speaking-booster',
      name: 'Up Inter',
      materialsSummary:
        'Telling experience, opini, pengembangan ide, giving solution, Sign Post, CCU, Jobs, Songs, presentasi, listening, dan materi terkait.',
      targetGoal: 'Melatih siswa untuk beropini dan memperluas wawasan.',
      scheduleSlot1: '10.00–11.30',
      tutorSlot1: 'Mr. B',
      scheduleSlot2: '13.30–15.00',
      tutorSlot2: 'Bro. A',
      price: 200000,
      durationLabel: '2 minggu (2 kelas)',
      isActive: true,
      sortOrder: 4,
    },
  },
  {
    id: 'ted-pre-advance',
    data: {
      programId: 'ted-talk',
      name: 'Pre Advance',
      materialsSummary:
        'Sharing, solving problem, debates, dating, konservasi, man and woman, song, public speaking, dan materi terkait.',
      targetGoal: 'Melatih siswa mempertahankan pendapat dan memperluas wawasan.',
      scheduleSlot1: '15.30',
      tutorSlot1: 'Mr. B',
      scheduleSlot2: '',
      tutorSlot2: '',
      price: 150000,
      durationLabel: '2 minggu',
      isActive: true,
      sortOrder: 5,
    },
  },
  {
    id: 'ted-up-advance',
    data: {
      programId: 'ted-talk',
      name: 'Up Advance',
      materialsSummary: 'Menantang siswa menggunakan 99% bahasa Inggris.',
      targetGoal: 'Membuat kebiasaan berani dan percaya diri untuk speaking.',
      scheduleSlot1: '15.30',
      tutorSlot1: 'Bro. A',
      scheduleSlot2: '',
      tutorSlot2: '',
      price: 150000,
      durationLabel: '2 minggu',
      isActive: true,
      sortOrder: 6,
    },
  },
  {
    id: 'public-speaking-umum',
    data: {
      programId: 'public-speaking',
      name: 'Public Speaking',
      materialsSummary:
        'Berpidato dalam bahasa Inggris dan mempelajari teknik seperti body language dan speeches.',
      targetGoal: 'Melatih siswa berpidato dalam berbagai macam agenda.',
      scheduleSlot1: '',
      tutorSlot1: '',
      scheduleSlot2: '',
      tutorSlot2: '',
      price: 150000,
      durationLabel: '2 minggu',
      isActive: true,
      sortOrder: 7,
    },
  },
];

export const INITIAL_REGISTRATION_PERIODS: Array<{
  id: string;
  data: Omit<RegistrationPeriod, 'id'>;
}> = [
  {
    id: 'periode-tgl-10',
    data: {
      title: 'Periode Tanggal 10',
      dayOfMonth: 10,
      startDate: '',
      endDate: '',
      registrationCloseDate: '',
      quota: 0,
      enrolledCount: 0,
      programIds: [],
      notes: 'Periode pembelajaran dimulai tanggal 10 setiap bulan (rentang tanggal detail dapat diatur admin).',
      isOpen: true,
      isActive: true,
    },
  },
  {
    id: 'periode-tgl-25',
    data: {
      title: 'Periode Tanggal 25',
      dayOfMonth: 25,
      startDate: '',
      endDate: '',
      registrationCloseDate: '',
      quota: 0,
      enrolledCount: 0,
      programIds: [],
      notes: 'Periode pembelajaran dimulai tanggal 25 setiap bulan (rentang tanggal detail dapat diatur admin).',
      isOpen: true,
      isActive: true,
    },
  },
];

export const INITIAL_TUTORS: Array<{ id: string; data: Omit<Tutor, 'id'> }> = [
  {
    id: 'tutor-bro-a',
    data: {
      name: 'Bro. A',
      photoUrl: '/src/assets/images/tutor_portrait_1_1795524910149.jpg',
      experience: 'Pengajar Speaking Starter, Speaking Booster, dan TED Talk (detail dapat dilengkapi admin)',
      origin: 'Belum dilengkapi admin',
      bio: 'Mengampu kelas Speaking Starter (Pre Basic & Up Basic), Speaking Booster (Pre Inter & Up Inter), serta TED Talk (Up Advance).',
      isActive: true,
      sortOrder: 1,
    },
  },
  {
    id: 'tutor-mr-b',
    data: {
      name: 'Mr. B',
      photoUrl: '',
      experience: 'Pengajar Speaking Starter, Speaking Booster, dan TED Talk (detail dapat dilengkapi admin)',
      origin: 'Belum dilengkapi admin',
      bio: 'Mengampu kelas Speaking Starter (Pre Basic & Up Basic), Speaking Booster (Pre Inter & Up Inter), serta TED Talk (Pre Advance).',
      isActive: true,
      sortOrder: 2,
    },
  },
];

export const INITIAL_GALLERY_ITEMS: Array<{ id: string; data: Omit<GalleryItem, 'id'> }> = [
  {
    id: 'gal-speaking-booster',
    data: {
      title: 'Aktivitas Kelas Speaking',
      description: 'Ilustrasi kegiatan diskusi kelompok kecil dan praktik berbicara aktif di kelas.',
      category: 'Ilustrasi Kelas',
      imageUrl: '/src/assets/images/gallery_speaking_club_1795524909062.jpg',
      images: ['/src/assets/images/gallery_speaking_club_1795524909062.jpg'],
      sortOrder: 1,
      isActive: true,
    },
  },
  {
    id: 'gal-public-speaking',
    data: {
      title: 'Latihan Public Speaking & Presentasi',
      description: 'Ilustrasi latihan pidato bahasa Inggris, body language, dan penyampaian opini.',
      category: 'Ilustrasi Kelas',
      imageUrl: '/src/assets/images/gallery_public_speaking_1795524910552.jpg',
      images: ['/src/assets/images/gallery_public_speaking_1795524910552.jpg'],
      sortOrder: 2,
      isActive: true,
    },
  },
  {
    id: 'gal-online-class',
    data: {
      title: 'Sesi Online Class Interaktif',
      description: 'Ilustrasi pembelajaran tatap muka daring dengan materi yang menyesuaikan level peserta.',
      category: 'Ilustrasi Online',
      imageUrl: '/src/assets/images/gallery_online_mentoring_1795524911618.jpg',
      images: ['/src/assets/images/gallery_online_mentoring_1795524911618.jpg'],
      sortOrder: 3,
      isActive: true,
    },
  },
];

export const INITIAL_FAQS: Array<{ id: string; data: Omit<FaqItem, 'id'> }> = [
  {
    id: 'faq-lokasi-legalitas',
    data: {
      question: 'Di mana lokasi ELITE Course dan bagaimana legalitas lembaganya?',
      answer:
        'ELITE (English Learning Institute) berdiri sejak tahun 2019 dan berlokasi di Jl. Aster, No. 02, Desa Tulungrejo, Kecamatan Pare, Kabupaten Kediri. ELITE memiliki No. Ijin FKB: 378/SR/PI/SK/FKB/II/2022 dan NIB: 220.6230.1583.22.',
      category: 'Tentang Lembaga',
      sortOrder: 1,
      isActive: true,
    },
  },
  {
    id: 'faq-periode',
    data: {
      question: 'Kapan periode pendaftaran kelas di ELITE Course dibuka?',
      answer:
        'Periode pendaftaran tersedia setiap tanggal 10 dan tanggal 25 setiap bulan, dengan jadwal dan kuota aktif yang dikelola langsung oleh admin ELITE Course.',
      category: 'Pendaftaran',
      sortOrder: 2,
      isActive: true,
    },
  },
  {
    id: 'faq-online-class',
    data: {
      question: 'Bagaimana sistem belajar pada program Online Class?',
      answer:
        'Program Online Class berlangsung 10 kali pertemuan (60 menit per pertemuan) selama 2 minggu dari Senin sampai Jumat. Materi menyesuaikan kebutuhan peserta (Grammar, Speaking, Pronunciation, atau materi lain), jadwal disepakati di awal, dan peserta memperoleh sertifikat bahasa Inggris.',
      category: 'Program Online',
      sortOrder: 3,
      isActive: true,
    },
  },
  {
    id: 'faq-cek-status',
    data: {
      question: 'Bagaimana cara mengecek status pendaftaran dan konfirmasi pembayaran?',
      answer:
        'Setelah mengirim formulir pendaftaran, Anda akan mendapatkan Kode Pendaftaran dan PIN pelacakan rahasia. Gunakan keduanya pada halaman Cek Status & Pembayaran untuk melihat status terkini dan mengunggah bukti transfer.',
      category: 'Pembayaran',
      sortOrder: 4,
      isActive: true,
    },
  },
];
