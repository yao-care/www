export const SITE = {
  name: '藥提醒 yao.care',
  url: 'https://www.yao.care',
  title: '藥提醒 yao.care — 用最貼近患者的方式提醒用藥',
  description:
    '藥提醒以病人為中心，依循藥品使用標準碼與 ATC 編碼，透過 LINE、Telegram 等通訊軟體提供用藥提醒，協助藥師追蹤服藥成效。整合健保與醫院資訊系統，涵蓋智慧醫療、老藥新用驗證等服務。',
  keywords:
    '藥提醒,智慧醫療,用藥提醒,LINE用藥提醒,老藥新用,健保藥物,藥師,ATC編碼,服藥追蹤,居家醫療,通訊軟體,TxGNN',
  ogImage: '/assets/images/blog/share.jpg',
  email: 'service@yao.care',
  address: '台中市西區台灣大道二段239號13樓 (遠東金融商業大樓)',
  lineLink: 'https://lin.ee/1F7s4pP',
  pptxLink: '/藥提醒Line民眾服務.ppsx',
  txgnnLink: 'https://twtxgnn.yao.care/',
  mapsLink: 'https://goo.gl/maps/ZkbwDs6SoqaGHjPo8',
} as const;

export const NAV = [
  { href: '#about', label: '智慧醫療' },
  { href: '#feature', label: '潛在優勢' },
  { href: '#sixbig', label: '優質服務' },
  { href: '#twtxgnn', label: '老藥新用' },
  { href: '#blog', label: '簡易驗證方式' },
  { href: '#screenshots', label: '案例範例' },
  { href: '#cta', label: '與工程師聯絡' },
  { href: '#contact', label: '聯絡我們' },
] as const;
