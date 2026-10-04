---
title: GPU Portfolio & Risk Decision Engine
short: GPU Portfolio Engine
tagline: Portfolio optimizer, built twice
kind: flagship
color: "#1F77B4"
group: flagship
order: 4
role: Solo build
dates: Jul/Aug 2026–present
status: Built; CPU and GPU paths committed
summary: "A portfolio optimizer built twice, on CPU and GPU, with a parity suite proving both give the same answer."
proof:
  - QP solve 2.48–2.66× faster at 3,000 assets
  - Parity to 1e-6
  - 100+ tests
stack:
  - Python
  - RAPIDS cuDF and cuML
  - NVIDIA cuOpt
  - CVXPY and Clarabel
  - pandas
  - Docker
links:
  - label: Repo
    href: https://github.com/jasonpereira518/gpu-portfolio-optimization-engine
cover: gpu-portfolio-engine.png
coverAlt: "Bar chart of QP solve time on CPU and GPU at 50, 500 and 3,000 assets, for two covariance models. The CPU solve is faster at 50 and 500 assets; the GPU solve is 2.48 to 2.66 times faster at 3,000."
coverFit: contain
problem: "GPU speedups are easy to inflate with a slow baseline. I wanted to know where a GPU actually pays off in portfolio optimization."
result: "The QP solve is 2.48–2.66× faster on GPU at 3,000 assets (5.96 s to 2.41 s), with the crossover between 500 and 3,000 assets and parity to 1e-6. Lot rounding beat the greedy baseline in 18 of 18 cases. Only the solve stage wins on GPU; I don't claim an end-to-end speedup."
---

A mean-variance optimizer built twice, once on CPU and once on GPU, sharing one interface. A parity suite proves both paths give the same answer before any timing is trusted, and a benchmark harness times each stage separately.

It includes three risk models, lot rounding with transaction costs, and a backtest with no lookahead.
