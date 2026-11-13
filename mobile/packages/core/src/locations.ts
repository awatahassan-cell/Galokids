/**
 * Iraq's governorates and their districts, for a delivery address.
 *
 * The website's own list (src/data/iraq-locations.json), reduced to the names a
 * picker needs. `en` is the canonical value that is stored and sent — the same
 * rule the website follows, because a translated label saved as the value does
 * not match itself the next time the address is opened.
 */
export interface District {
  id: string;
  en: string;
  ku: string;
}

export interface Governorate {
  id: string;
  en: string;
  ku: string;
  districts: District[];
}

export const GOVERNORATES: Governorate[] = [
  {
    "id": "erbil",
    "en": "Erbil",
    "ku": "هەولێر",
    "districts": [
      {
        "id": "erbil_center",
        "en": "Erbil Central",
        "ku": "سەنتەری هەولێر"
      },
      {
        "id": "soran",
        "en": "Soran",
        "ku": "سۆران"
      },
      {
        "id": "shaqlawa",
        "en": "Shaqlawa",
        "ku": "شەقڵاوە"
      },
      {
        "id": "koya",
        "en": "Koya",
        "ku": "کۆیە"
      },
      {
        "id": "choman",
        "en": "Choman",
        "ku": "چۆمان"
      },
      {
        "id": "khabat",
        "en": "Khabat",
        "ku": "خەبات"
      },
      {
        "id": "rawanduz",
        "en": "Rawanduz",
        "ku": "ڕواندز"
      },
      {
        "id": "mergasor",
        "en": "Mergasor",
        "ku": "مێرگەسۆر"
      }
    ]
  },
  {
    "id": "sulaymaniyah",
    "en": "Sulaymaniyah",
    "ku": "سلێمانی",
    "districts": [
      {
        "id": "suleimani_center",
        "en": "Sulaymaniyah Central",
        "ku": "سەنتەری سلێمانی"
      },
      {
        "id": "rania",
        "en": "Rania",
        "ku": "ڕانیە"
      },
      {
        "id": "pshdar",
        "en": "Qaladiza / Pshdar",
        "ku": "قەڵادزێ / پشدەر"
      },
      {
        "id": "kalar",
        "en": "Kalar",
        "ku": "کەلار"
      },
      {
        "id": "chamchamal",
        "en": "Chamchamal",
        "ku": "چەمچەماڵ"
      },
      {
        "id": "dukan",
        "en": "Dukan",
        "ku": "دووکان"
      },
      {
        "id": "penjwen",
        "en": "Penjwen",
        "ku": "پێنجوێن"
      },
      {
        "id": "saidsadiq",
        "en": "Said Sadiq",
        "ku": "سەید سادق"
      },
      {
        "id": "kifri",
        "en": "Kifri",
        "ku": "کفری"
      }
    ]
  },
  {
    "id": "duhok",
    "en": "Duhok",
    "ku": "دهۆک",
    "districts": [
      {
        "id": "duhok_center",
        "en": "Duhok Central",
        "ku": "سەنتەری دهۆک"
      },
      {
        "id": "zakho",
        "en": "Zakho",
        "ku": "زاخۆ"
      },
      {
        "id": "akre",
        "en": "Akre",
        "ku": "ئاکرێ"
      },
      {
        "id": "amedi",
        "en": "Amedi",
        "ku": "ئامێدی"
      },
      {
        "id": "semel",
        "en": "Semel",
        "ku": "سێمێل"
      },
      {
        "id": "shekhan",
        "en": "Shekhan",
        "ku": "شێخان"
      }
    ]
  },
  {
    "id": "halabja",
    "en": "Halabja",
    "ku": "هەڵەبجە",
    "districts": [
      {
        "id": "halabja_center",
        "en": "Halabja Central",
        "ku": "سەنتەری هەڵەبجە"
      }
    ]
  },
  {
    "id": "kirkuk",
    "en": "Kirkuk",
    "ku": "کەرکووک",
    "districts": [
      {
        "id": "kirkuk_center",
        "en": "Kirkuk Central",
        "ku": "سەنتەری کەرکووک"
      },
      {
        "id": "hawija",
        "en": "Hawija",
        "ku": "حەویجە"
      },
      {
        "id": "daquq",
        "en": "Daquq",
        "ku": "داقووق"
      }
    ]
  },
  {
    "id": "baghdad",
    "en": "Baghdad",
    "ku": "بەغدا",
    "districts": [
      {
        "id": "baghdad_center",
        "en": "Baghdad Central",
        "ku": "سەنتەری بەغدا"
      },
      {
        "id": "abu_ghraib",
        "en": "Abu Ghraib",
        "ku": "ئەبو غرێب"
      },
      {
        "id": "mahmudiya",
        "en": "Mahmudiya",
        "ku": "مەحمودییە"
      }
    ]
  },
  {
    "id": "nineveh",
    "en": "Nineveh",
    "ku": "نەینەوا",
    "districts": [
      {
        "id": "mosul_center",
        "en": "Mosul Central",
        "ku": "سەنتەری مووسڵ"
      },
      {
        "id": "tal_afar",
        "en": "Tal Afar",
        "ku": "تەلەعفەر"
      }
    ]
  },
  {
    "id": "basra",
    "en": "Basra",
    "ku": "بەسرە",
    "districts": [
      {
        "id": "basra_center",
        "en": "Basra Central",
        "ku": "سەنتەری بەسرە"
      },
      {
        "id": "al_zubair",
        "en": "Al-Zubair",
        "ku": "زوبێر"
      }
    ]
  },
  {
    "id": "anbar",
    "en": "Anbar",
    "ku": "ئەنبار",
    "districts": [
      {
        "id": "ramadi",
        "en": "Ramadi Central",
        "ku": "سەنتەری ڕەمادی"
      },
      {
        "id": "fallujah",
        "en": "Fallujah",
        "ku": "فەللووجە"
      },
      {
        "id": "hit",
        "en": "Hit",
        "ku": "هێت"
      }
    ]
  },
  {
    "id": "babil",
    "en": "Babil",
    "ku": "بابل",
    "districts": [
      {
        "id": "hilla",
        "en": "Hilla Central",
        "ku": "سەنتەری حللە"
      },
      {
        "id": "musayab",
        "en": "Musayab",
        "ku": "موسەییب"
      }
    ]
  },
  {
    "id": "diyala",
    "en": "Diyala",
    "ku": "دیالە",
    "districts": [
      {
        "id": "baqubah",
        "en": "Baqubah Central",
        "ku": "سەنتەری بەعقووبە"
      },
      {
        "id": "khanaqin",
        "en": "Khanaqin",
        "ku": "خانەقین"
      },
      {
        "id": "muqdadiya",
        "en": "Muqdadiya",
        "ku": "مەقدادییە"
      }
    ]
  },
  {
    "id": "dhi_qar",
    "en": "Dhi Qar",
    "ku": "ذی قار",
    "districts": [
      {
        "id": "nasiriyah",
        "en": "Nasiriyah Central",
        "ku": "سەنتەری ناسرییە"
      },
      {
        "id": "suq_al_shuyukh",
        "en": "Suq Al-Shuyukh",
        "ku": "سووق ئەلشیووخ"
      }
    ]
  },
  {
    "id": "karbala",
    "en": "Karbala",
    "ku": "کەربەلا",
    "districts": [
      {
        "id": "karbala_center",
        "en": "Karbala Central",
        "ku": "سەنتەری کەربەلا"
      },
      {
        "id": "hindiya",
        "en": "Hindiya",
        "ku": "هیندییە"
      }
    ]
  },
  {
    "id": "maysan",
    "en": "Maysan",
    "ku": "میسان",
    "districts": [
      {
        "id": "amarah",
        "en": "Amarah Central",
        "ku": "سەنتەری عەمارە"
      },
      {
        "id": "majar_al_kabir",
        "en": "Majar Al-Kabir",
        "ku": "مەجەر ئەلکەبیر"
      }
    ]
  },
  {
    "id": "muthanna",
    "en": "Muthanna",
    "ku": "موسەننا",
    "districts": [
      {
        "id": "samawah",
        "en": "Samawah Central",
        "ku": "سەنتەری سەماوە"
      },
      {
        "id": "rumaitha",
        "en": "Rumaitha",
        "ku": "ڕومەیسە"
      }
    ]
  },
  {
    "id": "najaf",
    "en": "Najaf",
    "ku": "نەجەف",
    "districts": [
      {
        "id": "najaf_center",
        "en": "Najaf Central",
        "ku": "سەنتەری نەجەف"
      },
      {
        "id": "manathera",
        "en": "Manathera",
        "ku": "مەنازیرە"
      }
    ]
  },
  {
    "id": "qadisiyyah",
    "en": "Al-Qadisiyyah",
    "ku": "قادسییە (دیوانییە)",
    "districts": [
      {
        "id": "diwaniyah",
        "en": "Diwaniyah Central",
        "ku": "سەنتەری دیوانییە"
      },
      {
        "id": "afak",
        "en": "Afak",
        "ku": "عەفەک"
      }
    ]
  },
  {
    "id": "saladin",
    "en": "Saladin",
    "ku": "سەڵاحەدین",
    "districts": [
      {
        "id": "tikrit",
        "en": "Tikrit Central",
        "ku": "سەنتەری تکریت"
      },
      {
        "id": "samarra",
        "en": "Samarra",
        "ku": "سامەڕا"
      },
      {
        "id": "balad",
        "en": "Balad",
        "ku": "بەلەد"
      },
      {
        "id": "tuz_khurmatu",
        "en": "Tuz Khurmatu",
        "ku": "تۆزخورماتوو"
      }
    ]
  },
  {
    "id": "wasit",
    "en": "Wasit",
    "ku": "واست",
    "districts": [
      {
        "id": "kut",
        "en": "Kut Central",
        "ku": "سەنتەری کووت"
      },
      {
        "id": "suwaira",
        "en": "Suwaira",
        "ku": "سوێرە"
      }
    ]
  }
];
