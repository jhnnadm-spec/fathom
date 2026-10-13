/**
 * A plain-English key to the terms in TradingView's market data box.
 * Fathom can't read the numbers inside that box (TradingView only allows it
 * to be displayed), so instead it explains what each label means and how to read it.
 */
export type MarketTerm = { term: string; plain: string; read?: string };

export const MARKET_TERMS: { group: string; terms: MarketTerm[] }[] = [
  {
    group: "Reading the labels",
    terms: [
      { term: "TTM", plain: "Trailing twelve months: the most recent 12 months added together, whatever the company's year." },
      { term: "FY", plain: "Fiscal year: the company's own 12-month accounting year, which doesn't always end in December." },
      { term: "FQ", plain: "Fiscal quarter: three months of the company's accounting year." },
      { term: "B, M, K", plain: "Billion, million and thousand. 2.5B means 2.5 billion." },
      { term: "T", plain: "Trillion. 5.05T means 5.05 trillion, or 5,050 billion." },
      { term: "Fiscal year end", plain: "The date the company's latest full accounting year ended." },
      { term: "Last fiscal period / period end date", plain: "The latest quarter the figures come from, such as 2026-Q3, and the date it ended." },
    ],
  },
  {
    group: "Size and price",
    terms: [
      { term: "Market capitalization (market cap)", plain: "The share price times the number of shares: what the whole company is worth on the stock market today.", read: "It shows size, not quality. It changes every time the share price moves." },
      { term: "Shares float", plain: "The shares that ordinary investors can actually buy and sell, leaving out those held by insiders." },
      { term: "Total shares outstanding", plain: "All the company's shares that exist and are owned by someone. Profit per share and market cap are worked out from this." },
      { term: "52 week high / low", plain: "The highest and lowest share price over the past year." },
      { term: "Average volume (10 day)", plain: "How many shares changed hands on a typical day over the last 10 trading days.", read: "Higher means the shares are easy to buy and sell quickly." },
      { term: "Beta", plain: "How much the share price tends to swing compared with the whole stock market.", read: "1 means it moves about as much as the market; above 1 means bigger swings; below 1 means smaller swings." },
      { term: "Enterprise value (EV)", plain: "Market cap plus debt, minus cash: roughly what it would cost to buy the whole company and pay off what it owes." },
    ],
  },
  {
    group: "Price compared with results (valuation)",
    terms: [
      { term: "Price to earnings (P/E)", plain: "The share price divided by a year of profit per share: how many dollars buyers pay for each $1 of yearly profit.", read: "A P/E of 30 means buyers pay $30 for each $1 of profit. A higher number usually means people expect profit to grow. It doesn't say whether the price is right." },
      { term: "Price to sales (P/S)", plain: "Market cap divided by a year of sales: how many dollars buyers pay for each $1 of yearly sales." },
      { term: "Price to book (P/B)", plain: "Market cap divided by shareholders' equity: the price compared with what the company is worth on paper." },
      { term: "Price to cash flow (P/CF)", plain: "Market cap divided by a year of cash from the everyday business: how many dollars buyers pay for each $1 of cash it brings in." },
      { term: "Price to free cash flow (P/FCF)", plain: "Market cap divided by a year of free cash flow: how many dollars buyers pay for each $1 of spare cash it produces." },
      { term: "EV to EBITDA", plain: "Enterprise value divided by EBITDA. Like P/E, but it includes debt and uses a profit figure before some costs, which makes companies with different debts easier to compare." },
    ],
  },
  {
    group: "Profit",
    terms: [
      { term: "Revenue", plain: "All the money it took in from customers before paying any costs. Also called sales." },
      { term: "Gross profit", plain: "Revenue minus the direct cost of making or buying what it sold." },
      { term: "Revenue per share", plain: "A year of sales divided by the number of shares: how much in sales each share represents." },
      { term: "Operating income", plain: "Profit from the main business, after product and running costs but before interest and tax." },
      { term: "EBITDA", plain: "Earnings before interest, tax, depreciation and amortisation: profit from the main business before some accounting and financing costs." },
      { term: "Net income", plain: "The profit left after every cost, including interest and tax." },
      { term: "Basic EPS / Diluted EPS", plain: "Net income divided by the number of shares: the profit that belongs to each share. Diluted also counts shares that could be created later, such as employee stock awards." },
      { term: "Gross, operating and net margin", plain: "How many dollars of every $100 of sales are left at each step: after product costs, after running costs, and after everything." },
      { term: "Pretax margin", plain: "How many dollars of every $100 of sales are left after all costs except tax." },
      { term: "Return on equity (ROE)", plain: "Profit compared with the money that belongs to shareholders on paper." },
      { term: "Return on assets (ROA)", plain: "Profit compared with everything the company owns: how well it turns its assets into profit." },
      { term: "Return on invested capital (ROIC)", plain: "Profit from the main business compared with all the money put in by shareholders and lenders.", read: "78% means about $78 of yearly profit for every $100 invested in the business." },
      { term: "Revenue per employee / net income per employee", plain: "A year of sales, or profit, divided by the number of employees." },
    ],
  },
  {
    group: "Debt and health",
    terms: [
      { term: "Total debt", plain: "All the money it has borrowed through loans and bonds." },
      { term: "Net debt", plain: "Debt minus cash. Below zero means it holds more cash than it owes in debt." },
      { term: "Current ratio", plain: "Short-term assets divided by bills due within a year.", read: "Above 1 means it has more than enough to cover its short-term bills." },
      { term: "Quick ratio", plain: "Like the current ratio, but leaving out stock waiting to be sold, because that can take time to turn into cash." },
      { term: "Debt to equity", plain: "Debt divided by shareholders' equity: how much it relies on borrowed money compared with shareholders' money." },
      { term: "Free cash flow", plain: "Cash from the everyday business minus spending on buildings and equipment: the spare cash it generated." },
      { term: "Operating cash flow", plain: "The cash the everyday business actually brought in during the period." },
      { term: "Investing cash flow", plain: "Cash spent on, or received from, long-term things like buildings, equipment, other companies and investments. A minus sign means more went out than came in." },
      { term: "Financing cash flow", plain: "Cash to and from lenders and shareholders: borrowing, paying back debt, buying back shares and paying dividends. A minus sign means more was paid out than raised." },
      { term: "CapEx (capital expenditure)", plain: "Money spent on buildings, equipment and other long-lasting things. Shown with a minus sign because it is cash going out." },
    ],
  },
  {
    group: "Dividends",
    terms: [
      { term: "Dividends per share (DPS)", plain: "The cash paid to shareholders for each share over a year." },
      { term: "Dividend yield", plain: "A year of dividends divided by the share price.", read: "A 2% yield means $2 a year for every $100 of shares, at today's price. It changes as the price moves." },
      { term: "Payout ratio", plain: "The share of profit paid out as dividends. 40% means $40 of every $100 of profit went to shareholders as dividends." },
    ],
  },
];
