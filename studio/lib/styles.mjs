// Data-only switchable style file. Editing a preset never requires editing a shot.
export const STYLES=Object.freeze({
  midnight:{bg:'#09101f',shade:'#151d2c',wall:'#27374a',accent:'#c1486a',key:'#8fa3e9',rim:'#63d9f8',text:'#f7e5da',fog:'#6e90b5',grain:.045,bloom:.18},
  ember:{bg:'#190d16',shade:'#321921',wall:'#4a292d',accent:'#ff9c51',key:'#f4be83',rim:'#ff664f',text:'#fff0ce',fog:'#a65242',grain:.06,bloom:.23},
  arctic:{bg:'#0b1822',shade:'#133445',wall:'#285262',accent:'#9bf2ff',key:'#a5f7e9',rim:'#50cfff',text:'#eaffff',fog:'#467c93',grain:.035,bloom:.15},
  ink:{bg:'#14121b',shade:'#24202c',wall:'#403647',accent:'#fa8bba',key:'#f4c3cf',rim:'#f899d0',text:'#fff0e5',fog:'#836f8c',grain:.07,bloom:.07}
});
// Authored bitmap-5x7 is the only caption font; no font downloads.
// Grade metadata records intended compositor controls for future profiles.
export const STYLE_GRADE=Object.freeze({
  midnight:{contrast:1.10,vignette:.25,bloom:.18,grain:.045,temperature:'cold',font:'original-5x7'},
  ember:{contrast:1.14,vignette:.29,bloom:.23,grain:.06,temperature:'warm',font:'original-5x7'},
  arctic:{contrast:1.08,vignette:.20,bloom:.15,grain:.035,temperature:'cold',font:'original-5x7'},
  ink:{contrast:1.20,vignette:.31,bloom:.07,grain:.07,temperature:'neutral',font:'original-5x7'}
});
