// app/api/yahoo-finance/route.js
// Next.js API Route — Proxy for Yahoo Finance to bypass CORS

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 });
  }

  try {
    // Yahoo Finance v8 chart API (unofficial but stable)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://finance.yahoo.com/',
        Origin: 'https://finance.yahoo.com',
      },
      next: { revalidate: 60 }, // cache 60 seconds
    });

    if (!res.ok) {
      return Response.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return Response.json({ error: 'No data found' }, { status: 404 });
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    // Get USD/IDR conversion for USD stocks
    let usdToIdr = 16000; // fallback
    if (meta.currency === 'USD') {
      try {
        const fxRes = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/IDR=X?interval=1d&range=1d',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://finance.yahoo.com/',
            },
          }
        );
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          const fxMeta = fxData?.chart?.result?.[0]?.meta;
          if (fxMeta?.regularMarketPrice) {
            usdToIdr = fxMeta.regularMarketPrice;
          }
        }
      } catch (_) {}
    }

    return Response.json({
      ticker,
      name: meta.longName || meta.shortName || ticker,
      price,
      currency: meta.currency,
      change24h,
      prevClose,
      usdToIdr,
      exchange: meta.exchangeName,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
