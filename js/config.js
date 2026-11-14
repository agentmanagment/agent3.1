// ============================================================
//  Portal configuration — original data sources (unchanged)
// ============================================================
window.PORTAL = {
  name: 'Agent Portal',
  LOGO: 'img/logo.svg',            // local copy (GitHub repo mein img/logo.svg upload karo)
  LOGO_REMOTE: 'https://managment.io/img/logo.svg',
  SRC: {
    users:       { sheet: '1ceJEL9omxk8btcFyaXTkLte7qSy6nVuPOtW8O3OI3F8' },
    withdrawals: { sheet: '1cpiLFItR6XLTookeZT5-9QJqcgJv28pQ3lMaNc2AlaQ', api: 'k76oqu1eo6sxg' },
    deposits:    { sheet: '1UPT_4aeGEcibpMrilgkNknlaF-vwT1YLVwaUsGj9mKc', api: '1e4k53su959b1' },
    maintenance: { sheet: '1JKYH84tKeBDZhrNX2YBQVVvYq4CJny-rIdyOk4RY2_4' },
    security:    { sheet: '1xhW1Qb8wWCJPalnIPiCmiugZPo05HUEuBDPTsi_D5g8' },
    banks:       { sheet: '1NBXZfhxmWT7gF5oolcZDcFGx0Igs-VaFpW8zgN77cqs' }
  },
  RATES: { withdrawal: 0.05, deposit: 0.03 },
  POLL_MS: 15000
};
