import { useMemo } from "react";
import { useLeadsStore, usePeriodStore } from "@/stores";
import { MetricCard } from "@/components/shared/MetricCard";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import type { Lead, LeadStage } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const CHART_COLORS = ["oklch(0.58 0.14 155)", "oklch(0.62 0.16 245)", "oklch(0.72 0.17 55)", "oklch(0.83 0.15 90)", "oklch(0.60 0.20 305)"];

function useAnalytics(leads: Lead[]) {
  return useMemo(() => {
    const byStage: Record<LeadStage, Lead[]> = { new: [], qualified: [], contacted: [], won: [], discarded: [] };
    leads.forEach((l) => byStage[l.stage].push(l));

    const total = leads.length;
    const enriched = leads.filter((l) => l.phone || l.whatsapp || l.email).length;
    const won = byStage.won;
    const revenue = won.reduce((s, l) => s + (l.closedValue ?? 0), 0);
    const pipelineValue = leads.filter((l) => l.stage !== "discarded" && l.stage !== "won").reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
    const conv = total ? (won.length / total) * 100 : 0;
    const avgTicket = won.length ? revenue / won.length : 0;

    // by day
    const byDay: Record<string, number> = {};
    leads.forEach((l) => {
      const d = new Date(l.discoveredAt).toLocaleDateString("pt-BR");
      byDay[d] = (byDay[d] ?? 0) + 1;
    });
    const daySeries = Object.entries(byDay).slice(-14).map(([date, leads]) => ({ date, leads }));

    const tempSeries = ["hot", "warm", "cold"].map((t) => ({ name: t === "hot" ? "Quente" : t === "warm" ? "Morno" : "Frio", value: leads.filter((l) => l.temperature === t).length }));

    const channelSeries = [
      { name: "WhatsApp", value: leads.filter((l) => l.whatsapp).length },
      { name: "Telefone", value: leads.filter((l) => l.phone).length },
      { name: "Instagram", value: leads.filter((l) => l.instagram).length },
      { name: "E-mail", value: leads.filter((l) => l.email).length },
      { name: "Site", value: leads.filter((l) => l.hasWebsite).length },
    ];

    const byNiche: Record<string, { total: number; qualified: number; contacted: number; won: number; revenue: number }> = {};
    leads.forEach((l) => {
      const k = l.category;
      byNiche[k] ??= { total: 0, qualified: 0, contacted: 0, won: 0, revenue: 0 };
      byNiche[k].total++;
      if (l.stage === "qualified") byNiche[k].qualified++;
      if (l.stage === "contacted") byNiche[k].contacted++;
      if (l.stage === "won") { byNiche[k].won++; byNiche[k].revenue += l.closedValue ?? 0; }
    });

    const byCity: Record<string, { total: number; qualified: number; contacted: number; won: number; revenue: number }> = {};
    leads.forEach((l) => {
      const k = l.city;
      byCity[k] ??= { total: 0, qualified: 0, contacted: 0, won: 0, revenue: 0 };
      byCity[k].total++;
      if (l.stage === "qualified") byCity[k].qualified++;
      if (l.stage === "contacted") byCity[k].contacted++;
      if (l.stage === "won") { byCity[k].won++; byCity[k].revenue += l.closedValue ?? 0; }
    });

    return { total, enriched, byStage, revenue, pipelineValue, conv, avgTicket, daySeries, tempSeries, channelSeries, byNiche, byCity, won };
  }, [leads]);
}

export function Dashboard({ leads }: { leads: Lead[] }) {
  const period = usePeriodStore((s) => s.period);
  const setPeriod = usePeriodStore((s) => s.setPeriod);
  const history = useLeadsStore((s) => s.history);
  const a = useAnalytics(leads);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Painel de conversão</h1>
          <p className="text-sm text-muted-foreground">Acompanhe métricas de leads, funil e receita.</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="h-8">
            <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
            <TabsTrigger value="7d" className="text-xs">7 dias</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs">30 dias</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs">90 dias</TabsTrigger>
            <TabsTrigger value="year" className="text-xs">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <MetricCard label="Total de leads" value={formatNumber(a.total)} delta={12.5} tooltip="Todos os leads carregados." />
        <MetricCard label="Enriquecidos" value={formatNumber(a.enriched)} delta={8.1} />
        <MetricCard label="Qualificados" value={formatNumber(a.byStage.qualified.length)} delta={3.2} />
        <MetricCard label="Contatados" value={formatNumber(a.byStage.contacted.length)} delta={-2.4} />
        <MetricCard label="Ganhos" value={formatNumber(a.byStage.won.length)} delta={18.9} accent="success" />
        <MetricCard label="Conversão" value={formatPercent(a.conv / 100)} delta={1.8} />
        <MetricCard label="Buscas" value={formatNumber(history.length)} />
        <MetricCard label="Valor em negociação" value={formatBRL(a.pipelineValue)} delta={5.4} />
        <MetricCard label="Receita fechada" value={formatBRL(a.revenue)} delta={22.7} accent="success" />
        <MetricCard label="Ticket médio" value={formatBRL(a.avgTicket)} delta={4.1} />
        <MetricCard label="Tempo médio conv." value="6 dias" delta={-8.3} />
        <MetricCard label="Taxa de resposta" value="38,2%" delta={5.1} tooltip="Taxa simulada de resposta às mensagens enviadas." />
      </div>

      <Card className="border-border/70 shadow-elegant">
        <CardHeader><CardTitle className="text-sm">Funil comercial</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {STAGE_ORDER.map((s, i) => {
              const count = a.byStage[s].length;
              const prev = i > 0 ? a.byStage[STAGE_ORDER[i - 1]].length : a.total;
              const pass = prev ? (count / prev) * 100 : 0;
              const value = a.byStage[s].reduce((sum, l) => sum + (s === "won" ? l.closedValue ?? 0 : l.estimatedValue ?? 0), 0);
              return (
                <div key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{STAGE_LABELS[s]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {count} • {formatBRL(value)} {i > 0 && <span className="ml-2 text-[10px]">({pass.toFixed(0)}% passagem)</span>}
                    </span>
                  </div>
                  <Progress value={a.total ? (count / a.total) * 100 : 0} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70 shadow-elegant">
          <CardHeader><CardTitle className="text-sm">Leads encontrados por dia</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={a.daySeries}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Line type="monotone" dataKey="leads" stroke="oklch(0.58 0.14 155)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-elegant">
          <CardHeader><CardTitle className="text-sm">Distribuição por temperatura</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={a.tempSeries} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {a.tempSeries.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-elegant">
          <CardHeader><CardTitle className="text-sm">Canais encontrados</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={a.channelSeries}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Bar dataKey="value" fill="oklch(0.62 0.16 245)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-elegant">
          <CardHeader><CardTitle className="text-sm">Leads por estágio</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={STAGE_ORDER.map((s) => ({ name: STAGE_LABELS[s], value: a.byStage[s].length }))}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Bar dataKey="value" fill="oklch(0.58 0.14 155)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-elegant">
        <CardHeader><CardTitle className="text-sm">Desempenho por nicho</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nicho</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Qualificados</TableHead>
                <TableHead className="text-right">Contatados</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(a.byNiche).sort((x, y) => y[1].total - x[1].total).map(([niche, v]) => {
                const max = Math.max(...Object.values(a.byNiche).map((x) => x.total), 1);
                return (
                  <TableRow key={niche}>
                    <TableCell className="font-medium">{niche}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums">{v.total}</span>
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(v.total / max) * 100}%` }} /></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.qualified}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.contacted}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.won}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.total ? ((v.won / v.total) * 100).toFixed(1) : "0"}%</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(v.revenue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-elegant">
        <CardHeader><CardTitle className="text-sm">Desempenho por cidade</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Qualificados</TableHead>
                <TableHead className="text-right">Contatados</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(a.byCity).sort((x, y) => y[1].total - x[1].total).map(([city, v]) => (
                <TableRow key={city}>
                  <TableCell className="font-medium">{city}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.qualified}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.contacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.won}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.total ? ((v.won / v.total) * 100).toFixed(1) : "0"}%</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(v.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
