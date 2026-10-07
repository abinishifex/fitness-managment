import Link from 'next/link';

const IMG = {
  hero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHfge8qNXNPLVHxf9zEyhTHSZhLAhycWjcu7yariE91ht5i8gsUkCEm0oBTlLMRcs8WdFsHol_Obn9mt9PhJhvSlhb6rM9apoHC7UvUavQMcgBinH2eifq_xuqBnuHM47LTtwamxwgAu8xWgfWfCJU6SQSKBwVrxKCbGeUfaWNNE7ibCV4stdfSiVWnSikgg_ei2wNBFI7XA40Lyw5jqwVZUuqOvhsTulYKFcOEKw',
  problem:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBkLVt4U1RLPuNtks07OLc1lvsob5B5Ps0ZSHi8SpBrOHMcnPTIIug233rMKmx4HYHX10Fk0fyYG7oy6Sf9MxAXhidsyJbPsLpfO-cwNz8zP7MkG_O5zvAZeFUQwyrcBN12uyKe2cT-UsmeZL5F8U8Uv4gzm08fNZNAcNB9UhPc55BDBkeTRY835pXvLZRiGLUarUKoqaD7aono7yhGNvsPKTyUKWwPR5A6UzaYja4',
  step1:
    'https://lh3.googleusercontent.com/aida/AEtjO1WdOdb_TOM2Xy3EEHTsJCxNtgYkR4svTE_C6b6L9TFIkj49gCSXwJAAuq5O-sg8qB6dAo_PZ0XscrGNaw6IGSGwZBTJbz42Pv-6PS1-yZpjpJ3CXCrwTTPkPrXK8qpLP6D0KBHZrBTUdIz3vSNPImqLw3xlIfvMEKq-xt7Sp2nmwMpkavRcD70kje_TtgLxF4myQoOh3dIgeM0hHl3j1E3I9yWj5ft35lh2TAYDH5Jy',
  step2:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAmty_B8fwLEL5cwBLgcnACsFfIAwYkn7BCA5rHqX9a3SO6bdRy9eJHyRJIi-9-fP0Pcm2y9DXCfIwACj1fYpnX64QL3MKV7cbm9p_WER5kOtzz4lYkqi2FZT_0j-rpuNAM_K8KuI7EzAFT94dHbbY9auCOrF4EcnI6lY_LF12K0xF8Ddgv5d3LOKNKDzKZ9-Ip28hcrtKH14qJp_mK3imQHjy52htr7ZBEalOgXUA',
  step3:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-1tocgAZLmoIREYNZBWa7iRc09OSMdYWFyGI94e8xkJnOZDayHvTrZub6Ts2bbm4HbX1W4xxvTrlOV6KLcGVxRCCONMFG9g9OazGGZIjsK-trLrtjQtWeLBVLq_jXvEUOtn2ZNwRWFRP2cvD6av9nlz-84WKZBfvgMkWBzMmgujM8Ib3TUT_NFYykPUs_Tlxy1ody3GH5fLM1HDdkR7M2wjpDqW4IIhcsmmdEVDI',
  squat:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHXwAw5Up-_TpTv1CccEGabmHmrkOCJKjRRij2QdQnXAQz4arXmnHBy0QP4A5aKR37P5Ygdy_VBoperfmiwF_Aw5Tusyeqft6nxZH5me6o0s4EGx4mstOvj_K0x_O8DrUlKpWrSMT5nGHSyag0Oc_xowlsm-QDpCk9MgTadXGVYd-OxHwgBI9bWXUrk2nNfgMnWt3itvt1t5pFg55AG1A75XNl4QnM7twqfkIkZAQ',
  trust:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHXwAw5Up-_TpTv1CccEGabmHmrkOCJKjRRij2QdQnXAQz4arXmnHBy0QP4A5aKR37P5Ygdy_VBoperfmiwF_Aw5Tusyeqft6nxZH5me6o0s4EGx4mstOvj_K0x_O8DrUlKpWrSMT5nGHSyag0Oc_xowlsm-QDpCk9MgTadXGVYd-OxHwgBI9bWXUrk2nNfgMnWt3itvt1t5pFg55AG1A75XNl4QnM7twqfkIkZAQ',
  athlete1:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-1tocgAZLmoIREYNZBWa7iRc09OSMdYWFyGI94e8xkJnOZDayHvTrZub6Ts2bbm4HbX1W4xxvTrlOV6KLcGVxRCCONMFG9g9OazGGZIjsK-trLrtjQtWeLBVLq_jXvEUOtn2ZNwRWFRP2cvD6av9nlz-84WKZBfvgMkWBzMmgujM8Ib3TUT_NFYykPUs_Tlxy1ody3GH5fLM1HDdkR7M2wjpDqW4IIhcsmmdEVDI',
  athlete2:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAmty_B8fwLEL5cwBLgcnACsFfIAwYkn7BCA5rHqX9a3SO6bdRy9eJHyRJIi-9-fP0Pcm2y9DXCfIwACj1fYpnX64QL3MKV7cbm9p_WER5kOtzz4lYkqi2FZT_0j-rpuNAM_K8KuI7EzAFT94dHbbY9auCOrF4EcnI6lY_LF12K0xF8Ddgv5d3LOKNKDzKZ9-Ip28hcrtKH14qJp_mK3imQHjy52htr7ZBEalOgXUA',
  cta: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmty_B8fwLEL5cwBLgcnACsFfIAwYkn7BCA5rHqX9a3SO6bdRy9eJHyRJIi-9-fP0Pcm2y9DXCfIwACj1fYpnX64QL3MKV7cbm9p_WER5kOtzz4lYkqi2FZT_0j-rpuNAM_K8KuI7EzAFT94dHbbY9auCOrF4EcnI6lY_LF12K0xF8Ddgv5d3LOKNKDzKZ9-Ip28hcrtKH14qJp_mK3imQHjy52htr7ZBEalOgXUA',
};

export default function Home() {
  return (
    <>
      <header className="bg-surface-base/80 backdrop-blur-md border-b border-surface-highlight sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-space-lg md:px-margin max-w-7xl mx-auto h-20">
          <Link href="/" className="flex items-center gap-space-sm group">
            <span className="w-3 h-3 bg-signal-volt inline-block" />
            <span className="text-headline-md font-headline-md tracking-wider text-steel-bright group-hover:text-signal-volt transition-colors">
              FORGE
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-space-lg">
            <a
              className="text-steel-muted hover:text-steel-bright transition-colors text-label-telemetry uppercase tracking-wider"
              href="#problem"
            >
              Overview
            </a>
            <a
              className="text-steel-muted hover:text-steel-bright transition-colors text-label-telemetry uppercase tracking-wider"
              href="#how-it-works"
            >
              How It Works
            </a>
            <a
              className="text-steel-muted hover:text-steel-bright transition-colors text-label-telemetry uppercase tracking-wider"
              href="#demo"
            >
              Workout
            </a>
            <a
              className="text-steel-muted hover:text-steel-bright transition-colors text-label-telemetry uppercase tracking-wider"
              href="#trust"
            >
              Adapt
            </a>
            <a
              className="text-steel-muted hover:text-steel-bright transition-colors text-label-telemetry uppercase tracking-wider"
              href="#athletes"
            >
              Athletes
            </a>
          </nav>
          <div className="flex items-center gap-space-md">
            <Link
              className="bg-signal-volt text-surface-base font-label-telemetry uppercase tracking-wider font-bold px-6 py-2.5 rounded-lg hover:bg-signal-volt-hover transition-all custom-glow text-xs"
              href="/register"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative w-full h-[90vh] min-h-[620px] flex overflow-hidden border-b border-surface-highlight items-center justify-center">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Ethiopian male powerlifter gripping loaded barbell"
            className="w-full h-full object-cover object-center filter contrast-125 brightness-[0.78]"
            src={IMG.hero}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-base/90 via-surface-base/30 to-transparent" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-space-lg md:px-margin text-center items-center flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-surface-overlay/85 border border-signal-volt/40 px-3 py-1 rounded mb-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-signal-volt animate-ping" />
            <span className="text-label-telemetry text-signal-volt uppercase tracking-widest text-[11px]">
              ADAPTIVE STRENGTH ENGINE
            </span>
          </div>
          <h1 className="text-display-hero-mobile md:text-display-hero font-display-hero uppercase tracking-tight text-steel-bright leading-none">
            TRAIN WITH PURPOSE.
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 justify-center">
            <Link
              className="bg-signal-volt text-surface-base font-label-telemetry uppercase tracking-wider font-bold px-9 py-4 rounded-lg hover:bg-signal-volt-hover transition-all custom-glow text-sm"
              href="/register"
            >
              Start free
            </Link>
            <span className="text-label-telemetry text-steel-muted text-xs uppercase tracking-wider">
              No equipment needed
            </span>
          </div>
        </div>
      </section>

      <section
        className="relative w-full py-space-xl border-b border-surface-highlight bg-surface-base"
        id="problem"
      >
        <div className="max-w-7xl mx-auto px-space-lg md:px-margin">
          <div className="relative w-full h-[520px] md:h-[600px] rounded-2xl overflow-hidden border border-surface-highlight group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Athlete sitting on bench preparing"
              className="w-full h-full object-cover object-center filter contrast-125 brightness-[0.75] group-hover:scale-102 transition-transform duration-700"
              src={IMG.problem}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-base/80 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 max-w-xl z-10">
              <div className="inline-flex items-center gap-2 bg-surface-overlay/90 backdrop-blur-md border border-signal-volt/50 px-3 py-1.5 rounded mb-3">
                <span className="material-symbols-outlined text-signal-volt text-sm">check_circle</span>
                <span className="text-label-telemetry text-signal-volt uppercase tracking-wider text-xs">
                  Zero wasted effort
                </span>
              </div>
              <h2 className="text-headline-xl-mobile md:text-display-hero font-headline-xl uppercase text-steel-bright leading-none">
                NO MORE GUESSING.
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative w-full py-space-xl border-b border-surface-highlight bg-surface-base"
        id="how-it-works"
      >
        <div className="max-w-7xl mx-auto px-space-lg md:px-margin">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-headline-xl-mobile md:text-headline-xl font-headline-xl uppercase text-steel-bright">
              HOW IT WORKS
            </h2>
            <span className="text-label-telemetry text-signal-volt uppercase tracking-widest text-xs hidden sm:inline-block">
              3 SIMPLE STEPS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="group relative rounded-xl overflow-hidden border border-surface-highlight h-[480px] flex flex-col justify-between p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Set Your Goal"
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.62] group-hover:scale-105 transition-transform duration-500"
                src={IMG.step1}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
              <div className="relative z-10 flex justify-between items-center">
                <span className="text-headline-lg font-headline-lg text-signal-volt">01</span>
                <span className="text-[11px] font-label-telemetry uppercase text-steel-muted bg-surface-base/80 px-2 py-0.5 rounded border border-surface-highlight">
                  INPUT
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="text-headline-md font-headline-md uppercase text-steel-bright">SET YOUR GOAL</h3>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden border border-surface-highlight h-[480px] flex flex-col justify-between p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Get Your Plan"
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.62] group-hover:scale-105 transition-transform duration-500"
                src={IMG.step2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
              <div className="relative z-10 flex justify-between items-center">
                <span className="text-headline-lg font-headline-lg text-signal-volt">02</span>
                <span className="text-[11px] font-label-telemetry uppercase text-signal-volt bg-surface-base/80 px-2 py-0.5 rounded border border-signal-volt/40">
                  AI PLAN
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="text-headline-md font-headline-md uppercase text-steel-bright">GET YOUR PLAN</h3>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden border border-surface-highlight h-[480px] flex flex-col justify-between p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Train Today"
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.62] group-hover:scale-105 transition-transform duration-500"
                src={IMG.step3}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
              <div className="relative z-10 flex justify-between items-center">
                <span className="text-headline-lg font-headline-lg text-signal-volt">03</span>
                <span className="text-[11px] font-label-telemetry uppercase text-steel-muted bg-surface-base/80 px-2 py-0.5 rounded border border-surface-highlight">
                  ACTIVE
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="text-headline-md font-headline-md uppercase text-steel-bright">TRAIN TODAY</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative w-full py-space-xl border-b border-surface-highlight bg-surface-base"
        id="demo"
      >
        <div className="max-w-7xl mx-auto px-space-lg md:px-margin">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-label-telemetry text-signal-volt uppercase tracking-widest text-xs">
              WORKOUT TELEMETRY
            </span>
            <h2 className="text-headline-xl-mobile md:text-headline-xl font-headline-xl uppercase text-steel-bright mt-1">
              YOUR WORKOUT. READY.
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 xl:gap-8 max-w-6xl mx-auto pt-4">
            {/* Left phone */}
            <div className="w-full max-w-[320px] lg:max-w-[310px] xl:max-w-[320px] bg-surface-overlay/95 border border-surface-highlight rounded-[2.5rem] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-md transform lg:-rotate-2 lg:scale-95 transition-transform duration-500 hover:scale-100 hover:rotate-0 flex flex-col justify-between">
              <div className="w-24 h-3.5 bg-surface-highlight mx-auto rounded-full mb-3 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-surface-base mr-1.5" />
                <div className="w-3 h-1 rounded-full bg-surface-base" />
              </div>
              <div className="flex justify-between items-center mb-3 px-1">
                <div>
                  <span className="text-[10px] font-label-telemetry text-steel-muted uppercase tracking-wider block">
                    TELEMETRY SYNC
                  </span>
                  <h4 className="text-headline-md font-headline-md text-steel-bright leading-none uppercase">
                    READINESS 94%
                  </h4>
                </div>
                <span className="material-symbols-outlined text-signal-volt text-lg">bolt</span>
              </div>
              <div className="bg-surface-raised p-3 rounded-xl border border-surface-highlight mb-3">
                <div className="flex justify-between items-center text-[10px] font-label-telemetry mb-1.5">
                  <span className="text-steel-muted uppercase">CNS RECOVERY</span>
                  <span className="text-signal-volt font-bold">OPTIMAL</span>
                </div>
                <div className="w-full bg-surface-highlight h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-signal-volt h-full w-[94%]" />
                </div>
                <div className="flex justify-between text-[11px] font-label-telemetry text-steel-muted">
                  <span>HRV 78ms</span>
                  <span>SLEEP 8.4H</span>
                  <span>FATIGUE LOW</span>
                </div>
              </div>
              <div className="bg-surface-raised p-3 rounded-xl border border-signal-volt/40 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-label-telemetry uppercase text-signal-volt px-1.5 py-0.5 rounded bg-surface-base/80 border border-signal-volt/40">
                    TODAY&apos;S SPLIT
                  </span>
                  <span className="text-[10px] font-label-telemetry text-steel-muted">BLOCK 04</span>
                </div>
                <p className="text-title-md font-headline-md text-steel-bright uppercase leading-tight">
                  HEAVY LOWER STRENGTH
                </p>
                <p className="text-[11px] font-label-telemetry text-steel-muted mt-1">
                  Progression target: +2.5% load velocity
                </p>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-base/80 border border-surface-highlight text-xs font-label-telemetry">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-volt" />
                    <span className="text-steel-bright font-bold">MON • SQUAT + PULL</span>
                  </div>
                  <span className="text-signal-volt text-[10px]">COMPLETED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-base/80 border border-signal-volt/50 text-xs font-label-telemetry">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-volt animate-ping" />
                    <span className="text-steel-bright font-bold">WED • BARBELL SQUAT</span>
                  </div>
                  <span className="text-steel-bright text-[10px] bg-surface-highlight px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-base/80 border border-surface-highlight text-xs font-label-telemetry text-steel-muted">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-surface-highlight" />
                    <span>FRI • POWER HYPERTROPHY</span>
                  </div>
                  <span className="text-[10px]">PLANNED</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface-highlight/60 border border-surface-highlight text-center text-[10px] font-label-telemetry text-steel-muted uppercase tracking-wider">
                SYNCED WITH SMART BARBELL SENSOR
              </div>
              <div className="w-24 h-1 bg-surface-highlight mx-auto rounded-full mt-3" />
            </div>

            {/* Center phone */}
            <div className="w-full max-w-[360px] bg-surface-overlay/95 border-2 border-signal-volt/50 rounded-[2.5rem] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-md z-10 custom-glow relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-signal-volt text-surface-base font-label-telemetry font-bold text-[10px] uppercase px-3 py-0.5 rounded-full tracking-widest shadow">
                LIVE WORKOUT SESSION
              </div>
              <div className="w-28 h-4 bg-surface-highlight mx-auto rounded-full mb-4 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-surface-base mr-2" />
                <div className="w-4 h-1 rounded-full bg-surface-base" />
              </div>
              <div className="relative h-44 rounded-xl overflow-hidden border border-surface-highlight mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Barbell Squat Demo"
                  className="w-full h-full object-cover filter contrast-125 brightness-90"
                  src={IMG.squat}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-[10px] font-label-telemetry text-signal-volt uppercase tracking-widest">
                    ACTIVE LIFT
                  </span>
                  <p className="text-headline-md font-headline-md text-steel-bright uppercase leading-tight">
                    BARBELL SQUAT
                  </p>
                </div>
              </div>
              <div className="bg-surface-raised p-3 rounded-lg border border-surface-highlight text-center mb-4">
                <span className="text-title-md font-label-telemetry text-steel-bright font-bold tracking-wide">
                  3 Sets • 5 Reps • 180 KG
                </span>
              </div>
              <div className="flex items-center justify-center gap-6 my-4 bg-surface-base/80 p-4 rounded-xl border border-surface-highlight">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-highlight"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-signal-volt"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="85, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute font-headline-md text-steel-bright text-lg">85%</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-label-telemetry text-steel-muted uppercase">SESSION TARGET</span>
                  <p className="text-label-telemetry text-signal-volt uppercase font-bold text-xs">Set 3 Completed</p>
                  <p className="text-steel-muted text-[11px] font-label-telemetry">Auto-adjusted +2.5kg</p>
                </div>
              </div>
              <button
                type="button"
                className="w-full py-3.5 bg-signal-volt text-surface-base font-label-telemetry font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-signal-volt-hover transition-all custom-glow"
              >
                LOG SET
              </button>
              <div className="w-28 h-1 bg-surface-highlight mx-auto rounded-full mt-4" />
            </div>

            {/* Right phone */}
            <div className="w-full max-w-[320px] lg:max-w-[310px] xl:max-w-[320px] bg-surface-overlay/95 border border-surface-highlight rounded-[2.5rem] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-md transform lg:rotate-2 lg:scale-95 transition-transform duration-500 hover:scale-100 hover:rotate-0 flex flex-col justify-between">
              <div className="w-24 h-3.5 bg-surface-highlight mx-auto rounded-full mb-3 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-surface-base mr-1.5" />
                <div className="w-3 h-1 rounded-full bg-surface-base" />
              </div>
              <div className="flex justify-between items-center mb-3 px-1">
                <div>
                  <span className="text-[10px] font-label-telemetry text-steel-muted uppercase tracking-wider block">
                    SET 03 ANALYSIS
                  </span>
                  <h4 className="text-headline-md font-headline-md text-steel-bright leading-none uppercase">
                    VELOCITY METRICS
                  </h4>
                </div>
                <span className="text-signal-volt text-[11px] font-label-telemetry font-bold px-2 py-0.5 rounded bg-surface-base/80 border border-signal-volt/40">
                  +2.5 KG PR
                </span>
              </div>
              <div className="bg-surface-raised p-3 rounded-xl border border-surface-highlight mb-3">
                <div className="flex justify-between items-end mb-1">
                  <div>
                    <span className="text-[10px] font-label-telemetry text-steel-muted uppercase">
                      MEAN CONCENTRIC VELOCITY
                    </span>
                    <p className="text-headline-lg font-headline-lg text-signal-volt leading-none mt-1">
                      0.48 <span className="text-sm text-steel-muted font-body-md">M/S</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-label-telemetry text-steel-muted uppercase">RPE EQUIVALENT</span>
                    <p className="text-title-md font-label-telemetry text-steel-bright font-bold">8.0 / 10</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-label-telemetry text-steel-muted mt-2 border-t border-surface-highlight pt-2">
                  <span className="material-symbols-outlined text-signal-volt text-xs">trending_up</span>
                  <span>+0.04 m/s faster than baseline load curve</span>
                </div>
              </div>
              <div className="bg-surface-base/80 p-3 rounded-xl border border-surface-highlight mb-3">
                <div className="flex justify-between items-center text-[10px] font-label-telemetry mb-2">
                  <span className="text-steel-muted uppercase">REP CONCENTRIC POWER CURVE</span>
                  <span className="text-steel-bright">5 REPS</span>
                </div>
                <svg className="w-full h-14 overflow-visible" viewBox="0 0 200 50">
                  <defs>
                    <linearGradient id="gradVolt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#D4FF00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 Q20,38 40,20 T80,14 T120,24 T160,18 T200,8 L200,50 L0,50 Z"
                    fill="url(#gradVolt)"
                  />
                  <path
                    d="M0,45 Q20,38 40,20 T80,14 T120,24 T160,18 T200,8"
                    fill="none"
                    stroke="#D4FF00"
                    strokeWidth="2.5"
                  />
                  <circle cx="40" cy="20" r="3" fill="#D4FF00" />
                  <circle cx="80" cy="14" r="3" fill="#D4FF00" />
                  <circle cx="120" cy="24" r="3" fill="#D4FF00" />
                  <circle cx="160" cy="18" r="3" fill="#D4FF00" />
                  <circle cx="200" cy="8" r="3" fill="#D4FF00" />
                </svg>
                <div className="flex justify-between text-[10px] font-label-telemetry text-steel-muted mt-2 border-t border-surface-highlight pt-1.5">
                  <span>R1: 0.52</span>
                  <span>R2: 0.50</span>
                  <span>R3: 0.49</span>
                  <span>R4: 0.46</span>
                  <span className="text-signal-volt font-bold">R5: 0.45</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-signal-volt/40 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-signal-volt text-base">check_circle</span>
                <div className="text-left">
                  <p className="text-[11px] font-label-telemetry text-steel-bright font-bold uppercase">
                    NEXT SET: ADVANCE TO 182.5 KG
                  </p>
                  <p className="text-[10px] font-label-telemetry text-steel-muted">
                    Velocity reserve intact. High power index.
                  </p>
                </div>
              </div>
              <div className="w-24 h-1 bg-surface-highlight mx-auto rounded-full mt-3" />
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              className="inline-block bg-signal-volt text-surface-base font-label-telemetry uppercase tracking-wider font-bold px-8 py-3.5 rounded-lg hover:bg-signal-volt-hover transition-all custom-glow text-xs"
              href="/register"
            >
              Start free
            </Link>
          </div>
        </div>
      </section>

      <section
        className="relative w-full py-space-xl border-b border-surface-highlight bg-surface-base"
        id="trust"
      >
        <div className="max-w-7xl mx-auto px-space-lg md:px-margin">
          <div className="relative w-full h-[520px] md:h-[580px] rounded-2xl overflow-hidden border border-surface-highlight flex items-end md:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="African fitness trainer spotting athlete"
              className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.72]"
              src={IMG.trust}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-base/90 via-surface-base/40 to-transparent" />
            <div className="relative z-10 p-8 md:p-12 max-w-xl">
              <h2 className="text-headline-xl-mobile md:text-display-hero font-headline-xl uppercase text-steel-bright leading-none mb-6">
                BUILT TO ADAPT.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface-overlay/85 backdrop-blur-md p-3 rounded-lg border border-surface-highlight flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-signal-volt text-xl">shield</span>
                  <span className="text-label-telemetry text-steel-bright uppercase text-xs">Safety Cap</span>
                </div>
                <div className="bg-surface-overlay/85 backdrop-blur-md p-3 rounded-lg border border-surface-highlight flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-signal-volt text-xl">sync</span>
                  <span className="text-label-telemetry text-steel-bright uppercase text-xs">Recovery Sync</span>
                </div>
                <div className="bg-surface-overlay/85 backdrop-blur-md p-3 rounded-lg border border-signal-volt/40 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-signal-volt text-xl">tune</span>
                  <span className="text-label-telemetry text-signal-volt uppercase text-xs">Load Adapt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative w-full py-space-xl border-b border-surface-highlight bg-surface-base"
        id="athletes"
      >
        <div className="max-w-7xl mx-auto px-space-lg md:px-margin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="relative h-[440px] rounded-xl overflow-hidden border border-surface-highlight flex flex-col justify-end p-8 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Ethiopian female athlete"
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.7] group-hover:scale-102 transition-transform duration-500"
                src={IMG.athlete1}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/30 to-transparent" />
              <div className="relative z-10 space-y-2">
                <p className="text-headline-md font-headline-md uppercase text-steel-bright leading-tight">
                  &quot;I FINALLY STAY CONSISTENT.&quot;
                </p>
                <span className="text-label-telemetry text-signal-volt uppercase text-xs tracking-wider block">
                  ATHLETE • 5X / WEEK
                </span>
              </div>
            </div>
            <div className="relative h-[440px] rounded-xl overflow-hidden border border-surface-highlight flex flex-col justify-end p-8 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Ethiopian male lifter"
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125 brightness-[0.7] group-hover:scale-102 transition-transform duration-500"
                src={IMG.athlete2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/30 to-transparent" />
              <div className="relative z-10 space-y-2">
                <p className="text-headline-md font-headline-md uppercase text-steel-bright leading-tight">
                  &quot;EVERY WORKOUT HAS A PURPOSE.&quot;
                </p>
                <span className="text-label-telemetry text-signal-volt uppercase text-xs tracking-wider block">
                  LIFTER • 180KG DEADLIFT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative w-full h-[600px] flex items-center justify-center overflow-hidden border-b border-surface-highlight"
        id="cta"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Athlete training finale"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.4] contrast-125"
          src={IMG.cta}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-surface-base" />
        <div className="relative z-10 max-w-3xl mx-auto px-space-lg text-center space-y-6">
          <h2 className="text-headline-xl-mobile md:text-display-hero font-display-hero text-steel-bright uppercase tracking-tight leading-none">
            START STRONG.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              className="w-full sm:w-auto bg-signal-volt text-surface-base font-label-telemetry uppercase tracking-wider font-bold px-10 py-5 rounded-lg hover:bg-signal-volt-hover transition-all custom-glow text-center text-sm"
              href="/register"
            >
              Start free
            </Link>
            <a
              className="w-full sm:w-auto bg-surface-overlay/90 hover:bg-surface-highlight text-steel-bright border border-surface-highlight px-8 py-5 rounded-lg font-label-telemetry uppercase tracking-wider text-center text-xs transition-colors"
              href="#how-it-works"
            >
              Build my plan
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-surface-base border-t border-surface-highlight py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center w-full px-space-lg md:px-margin max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-signal-volt inline-block" />
            <span className="text-headline-md font-headline-md tracking-wider text-steel-bright">FORGE</span>
          </div>
          <p className="text-label-telemetry uppercase tracking-widest text-steel-muted text-[11px]">
            © 2025 FORGE. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </>
  );
}
