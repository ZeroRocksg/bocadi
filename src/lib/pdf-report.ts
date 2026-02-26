import jsPDF from 'jspdf'
import autoTable, { type CellDef } from 'jspdf-autotable'
import type { Dish, Ingredient, WeekPlanEntry } from './types'

type CellInput = string | number | CellDef

// Reference values
const REFS = {
  kcal: 14000,       // weekly (2000/day * 7)
  protein_g: 350,    // 50g/day * 7
  carbs_g: 1925,     // 275g/day * 7
  fat_g: 546,        // 78g/day * 7
  fiber_g: 196,      // 28g/day * 7
  sodium_mg: 16100,  // 2300mg/day * 7
  vitamin_c_mg: 560, // 80mg/day * 7
  vitamin_d_ui: 4200,// 600 UI/day * 7
  calcium_mg: 7000,  // 1000mg/day * 7
  iron_mg: 126,      // 18mg/day * 7
  potassium_mg: 24500,// 3500mg/day * 7
}

const DAYS_ES: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

type EntryWithDish = WeekPlanEntry & { dish: Dish & { ingredients?: Ingredient[] } }

export interface ReportOptions {
  entries: EntryWithDish[]
  weekStart: Date
  weekEnd: Date
  workspaceName: string
  userEmail: string
  nutritionist: { name: string | null; license_number: string | null; logo_url: string | null } | null
}

function semaphore(pct: number): { color: [number, number, number]; label: string } {
  if (pct >= 80 && pct <= 120) return { color: [34, 197, 94], label: 'Óptimo' }
  if ((pct >= 50 && pct < 80) || (pct > 120 && pct <= 150)) return { color: [234, 179, 8], label: 'Revisar' }
  return { color: [239, 68, 68], label: 'Crítico' }
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function sumIngredients(ingredients: Ingredient[] | undefined, key: keyof Ingredient): number {
  return (ingredients ?? []).reduce((s, i) => s + (Number(i[key]) || 0), 0)
}

export async function generateNutritionReport(opts: ReportOptions): Promise<void> {
  const { entries, weekStart, weekEnd, workspaceName, userEmail, nutritionist } = opts
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = W - margin * 2

  // Colors
  const PRIMARY: [number, number, number] = [6, 182, 212]   // cyan-500
  const DARK: [number, number, number] = [15, 23, 42]
  const GRAY: [number, number, number] = [100, 116, 139]
  const LIGHT: [number, number, number] = [241, 245, 249]

  // ─── Totals ───
  const totalKcal = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'estimated_kcal'), 0)
  const totalProtein = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'protein_g'), 0)
  const totalCarbs = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'carbs_g'), 0)
  const totalFat = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'fat_g'), 0)
  const totalFiber = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'fiber_g'), 0)
  const totalSodium = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'sodium_mg'), 0)
  const totalVitC = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'vitamin_c_mg'), 0)
  const totalVitD = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'vitamin_d_ui'), 0)
  const totalCalcium = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'calcium_mg'), 0)
  const totalIron = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'iron_mg'), 0)
  const totalPotassium = entries.reduce((s, e) => s + sumIngredients(e.dish.ingredients, 'potassium_mg'), 0)

  function addHeader(title: string, pageNum: number) {
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, W, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('BOCADI — Reporte Nutricional', margin, 8)
    doc.text(`Página ${pageNum}`, W - margin, 8, { align: 'right' })
    doc.setFillColor(...PRIMARY)
    doc.setTextColor(...DARK)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, 22)
    doc.setDrawColor(...PRIMARY)
    doc.setLineWidth(0.5)
    doc.line(margin, 25, W - margin, 25)
  }

  // ═══════════════════════════════
  // PÁGINA 1 — PORTADA
  // ═══════════════════════════════
  // Fondo superior
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 70, 'F')

  // Logo Bocadi (texto estilizado)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('BOCADI', margin, 40)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Planificador Nutricional', margin, 50)

  // Nutricionista logo (si hay URL, se cargaría aquí; lo omitimos por CORS)
  // Datos nutricionista en esquina
  if (nutritionist?.name) {
    doc.setFontSize(9)
    doc.text(nutritionist.name, W - margin, 35, { align: 'right' })
    if (nutritionist.license_number) {
      doc.text(nutritionist.license_number, W - margin, 42, { align: 'right' })
    }
  }

  // Contenido portada
  doc.setTextColor(...DARK)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte Nutricional Semanal', margin, 90)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Paciente / Workspace: ${workspaceName}`, margin, 105)
  doc.text(`Email: ${userEmail}`, margin, 113)
  doc.text(`Período: ${formatDate(weekStart)} — ${formatDate(weekEnd)}`, margin, 121)

  if (nutritionist?.name) {
    doc.text(`Nutricionista: ${nutritionist.name}`, margin, 133)
    if (nutritionist.license_number) doc.text(`Colegiatura: ${nutritionist.license_number}`, margin, 141)
  }

  // Resumen rápido en portada
  doc.setFillColor(...LIGHT)
  doc.roundedRect(margin, 155, contentWidth, 60, 3, 3, 'F')
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen de la semana', margin + 5, 165)

  const summaryItems = [
    { label: 'Calorías totales', value: `${Math.round(totalKcal).toLocaleString()} kcal`, ref: REFS.kcal, actual: totalKcal },
    { label: 'Proteínas', value: `${totalProtein.toFixed(1)} g`, ref: REFS.protein_g, actual: totalProtein },
    { label: 'Carbohidratos', value: `${totalCarbs.toFixed(1)} g`, ref: REFS.carbs_g, actual: totalCarbs },
    { label: 'Grasas', value: `${totalFat.toFixed(1)} g`, ref: REFS.fat_g, actual: totalFat },
  ]

  summaryItems.forEach((item, i) => {
    const x = margin + 5 + (i % 2) * (contentWidth / 2)
    const y = 175 + Math.floor(i / 2) * 22
    const pct = item.ref > 0 ? (item.actual / item.ref) * 100 : 0
    const sem = semaphore(pct)
    doc.setFillColor(...sem.color)
    doc.circle(x + 2, y + 1, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text(item.label, x + 6, y + 2)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.setFontSize(11)
    doc.text(item.value, x + 6, y + 9)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`${pct.toFixed(0)}% del objetivo semanal`, x + 6, y + 15)
  })

  // ═══════════════════════════════
  // PÁGINA 2 — RESUMEN EJECUTIVO
  // ═══════════════════════════════
  doc.addPage()
  addHeader('Resumen Ejecutivo', 2)

  let y = 32

  // Tarjetas de macros
  const macroCards = [
    { label: 'Calorías', value: Math.round(totalKcal), unit: 'kcal', ref: REFS.kcal },
    { label: 'Proteínas', value: Math.round(totalProtein), unit: 'g', ref: REFS.protein_g },
    { label: 'Carbohidratos', value: Math.round(totalCarbs), unit: 'g', ref: REFS.carbs_g },
    { label: 'Grasas', value: Math.round(totalFat), unit: 'g', ref: REFS.fat_g },
  ]
  const cardW = (contentWidth - 9) / 4
  macroCards.forEach((card, i) => {
    const x = margin + i * (cardW + 3)
    const pct = card.ref > 0 ? (card.value / card.ref) * 100 : 0
    const sem = semaphore(pct)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, cardW, 28, 2, 2, 'F')
    doc.setFillColor(...sem.color)
    doc.rect(x, y, cardW, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(card.label, x + cardW / 2, y + 8, { align: 'center' })
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(`${card.value.toLocaleString()}`, x + cardW / 2, y + 18, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(`${card.unit} · ${pct.toFixed(0)}%`, x + cardW / 2, y + 24, { align: 'center' })
  })
  y += 35

  // Distribución % de macros (gráfico de barras horizontal simple)
  const macroTotal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9
  if (macroTotal > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Distribución de macronutrientes (% calorías)', margin, y + 5)
    y += 10

    const macroDistrib = [
      { label: 'Proteínas', kcal: totalProtein * 4, color: [99, 102, 241] as [number, number, number] },
      { label: 'Carbohidratos', kcal: totalCarbs * 4, color: [251, 191, 36] as [number, number, number] },
      { label: 'Grasas', kcal: totalFat * 9, color: [239, 68, 68] as [number, number, number] },
    ]

    const barH = 8
    let xBar = margin
    macroDistrib.forEach(m => {
      const pct = macroTotal > 0 ? m.kcal / macroTotal : 0
      const bW = contentWidth * pct
      if (bW > 0) {
        doc.setFillColor(...m.color)
        doc.rect(xBar, y, bW, barH, 'F')
        xBar += bW
      }
    })
    y += barH + 4

    macroDistrib.forEach((m, i) => {
      const x = margin + i * 55
      const pct = macroTotal > 0 ? (m.kcal / macroTotal) * 100 : 0
      doc.setFillColor(...m.color)
      doc.rect(x, y, 5, 4, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(`${m.label} ${pct.toFixed(1)}%`, x + 7, y + 4)
    })
    y += 12
  }

  // Semáforo nutricional
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Semáforo nutricional (vs. referencia semanal)', margin, y + 5)
  y += 10

  const semItems = [
    { label: 'Calorías', actual: totalKcal, ref: REFS.kcal, unit: 'kcal' },
    { label: 'Proteínas', actual: totalProtein, ref: REFS.protein_g, unit: 'g' },
    { label: 'Carbohidratos', actual: totalCarbs, ref: REFS.carbs_g, unit: 'g' },
    { label: 'Grasas', actual: totalFat, ref: REFS.fat_g, unit: 'g' },
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Nutriente', 'Total semana', 'Referencia', '% cubierto', 'Estado']],
    body: semItems.map(item => {
      const pct = item.ref > 0 ? (item.actual / item.ref) * 100 : 0
      const sem = semaphore(pct)
      return [item.label, `${item.actual.toFixed(1)} ${item.unit}`, `${item.ref} ${item.unit}`, `${pct.toFixed(0)}%`, sem.label]
    }),
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 4: { fontStyle: 'bold' } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const pct = semItems[data.row.index] ? (semItems[data.row.index].actual / semItems[data.row.index].ref) * 100 : 0
        const sem = semaphore(pct)
        doc.setFillColor(...sem.color)
        doc.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 1.5, 'F')
      }
    },
    theme: 'striped',
  })

  // ═══════════════════════════════
  // PÁGINA 3 — DETALLE DIARIO
  // ═══════════════════════════════
  doc.addPage()
  addHeader('Detalle Diario', 3)

  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const tableRows: CellInput[][] = []

  dayOrder.forEach(day => {
    const dayEntries = entries.filter(e => e.day_of_week === day)
    if (dayEntries.length === 0) return

    let dayKcal = 0, dayProtein = 0, dayCarbs = 0, dayFat = 0

    dayEntries.forEach(e => {
      const kcal = sumIngredients(e.dish.ingredients, 'estimated_kcal')
      const prot = sumIngredients(e.dish.ingredients, 'protein_g')
      const carb = sumIngredients(e.dish.ingredients, 'carbs_g')
      const fat = sumIngredients(e.dish.ingredients, 'fat_g')
      tableRows.push([DAYS_ES[day] || day, e.dish.name, Math.round(kcal), `${prot.toFixed(1)}g`, `${carb.toFixed(1)}g`, `${fat.toFixed(1)}g`])
      dayKcal += kcal; dayProtein += prot; dayCarbs += carb; dayFat += fat
    })
    tableRows.push([{ content: `Subtotal ${DAYS_ES[day]}`, styles: { fontStyle: 'bold' } }, '', Math.round(dayKcal), `${dayProtein.toFixed(1)}g`, `${dayCarbs.toFixed(1)}g`, `${dayFat.toFixed(1)}g`])
  })

  tableRows.push([{ content: 'TOTAL SEMANAL', styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255, 255, 255] } }, '', Math.round(totalKcal), `${totalProtein.toFixed(1)}g`, `${totalCarbs.toFixed(1)}g`, `${totalFat.toFixed(1)}g`])

  autoTable(doc, {
    startY: 32,
    margin: { left: margin, right: margin },
    head: [['Día', 'Plato', 'Kcal', 'Prot', 'Carbs', 'Grasas']],
    body: tableRows,
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    theme: 'striped',
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 18 }, 3: { cellWidth: 18 }, 4: { cellWidth: 18 }, 5: { cellWidth: 18 } },
  })

  // ═══════════════════════════════
  // PÁGINA 4 — MICRONUTRIENTES
  // ═══════════════════════════════
  doc.addPage()
  addHeader('Micronutrientes', 4)

  const microItems = [
    { label: 'Fibra', actual: totalFiber, ref: REFS.fiber_g, unit: 'g' },
    { label: 'Sodio', actual: totalSodium, ref: REFS.sodium_mg, unit: 'mg' },
    { label: 'Vitamina C', actual: totalVitC, ref: REFS.vitamin_c_mg, unit: 'mg' },
    { label: 'Vitamina D', actual: totalVitD, ref: REFS.vitamin_d_ui, unit: 'UI' },
    { label: 'Calcio', actual: totalCalcium, ref: REFS.calcium_mg, unit: 'mg' },
    { label: 'Hierro', actual: totalIron, ref: REFS.iron_mg, unit: 'mg' },
    { label: 'Potasio', actual: totalPotassium, ref: REFS.potassium_mg, unit: 'mg' },
  ]

  autoTable(doc, {
    startY: 32,
    margin: { left: margin, right: margin },
    head: [['Nutriente', 'Total semana', 'Ref. semanal', '% cubierto', 'Estado']],
    body: microItems.map(item => {
      const pct = item.ref > 0 ? (item.actual / item.ref) * 100 : 0
      const sem = semaphore(pct)
      return [item.label, `${item.actual.toFixed(1)} ${item.unit}`, `${item.ref} ${item.unit}`, `${pct.toFixed(0)}%`, sem.label]
    }),
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const pct = microItems[data.row.index] ? (microItems[data.row.index].actual / microItems[data.row.index].ref) * 100 : 0
        const sem = semaphore(pct)
        doc.setFillColor(...sem.color)
        doc.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 1.5, 'F')
      }
    },
    theme: 'striped',
  })

  // Leyenda semáforo
  const afterMicro = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Leyenda:', margin, afterMicro)
  const legend = [
    { color: [34, 197, 94] as [number, number, number], text: 'Óptimo: 80-120% del valor de referencia' },
    { color: [234, 179, 8] as [number, number, number], text: 'Revisar: 50-79% o 121-150%' },
    { color: [239, 68, 68] as [number, number, number], text: 'Crítico: < 50% o > 150%' },
  ]
  legend.forEach((l, i) => {
    doc.setFillColor(...l.color)
    doc.circle(margin + 3, afterMicro + 6 + i * 7, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(l.text, margin + 7, afterMicro + 8 + i * 7)
  })

  // ═══════════════════════════════
  // PÁGINA 5 — BALANCE PROTEICO
  // ═══════════════════════════════
  doc.addPage()
  addHeader('Balance Proteico', 5)

  // Conteo por tipo de proteína
  const proteinMap: Record<string, { name: string; color: string; grams: number; count: number }> = {}
  entries.forEach(e => {
    const pt = e.dish.protein_type
    const grams = sumIngredients(e.dish.ingredients, 'protein_g')
    if (pt) {
      if (!proteinMap[pt.id]) proteinMap[pt.id] = { name: pt.name, color: pt.color, grams: 0, count: 0 }
      proteinMap[pt.id].grams += grams
      proteinMap[pt.id].count++
    } else {
      if (!proteinMap['__none__']) proteinMap['__none__'] = { name: 'Sin categoría', color: '#9CA3AF', grams: 0, count: 0 }
      proteinMap['__none__'].grams += grams
      proteinMap['__none__'].count++
    }
  })

  const proteinList = Object.values(proteinMap).sort((a, b) => b.grams - a.grams)
  const maxGrams = Math.max(...proteinList.map(p => p.grams), 1)

  let py = 35
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Distribución de proteínas por tipo', margin, py)
  py += 8

  proteinList.forEach(p => {
    const barWidth = (p.grams / maxGrams) * (contentWidth - 50)
    const hex = p.color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(p.name, margin, py + 4)
    doc.setFillColor(r, g, b)
    doc.roundedRect(margin + 40, py, barWidth, 7, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`${p.grams.toFixed(1)}g (${p.count} plato${p.count !== 1 ? 's' : ''})`, margin + 40 + barWidth + 3, py + 5)
    py += 12
  })

  // Tabla resumen proteínas
  if (totalProtein > 0) {
    py += 5
    autoTable(doc, {
      startY: py,
      margin: { left: margin, right: margin },
      head: [['Tipo de proteína', 'Gramos totales', '% del total proteico', 'N° de platos']],
      body: proteinList.map(p => [p.name, `${p.grams.toFixed(1)} g`, `${((p.grams / totalProtein) * 100).toFixed(1)}%`, p.count]),
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      theme: 'striped',
    })
  }

  // Footer en todas las páginas
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`Generado por Bocadi · ${new Date().toLocaleDateString('es-PE')} · ${userEmail}`, margin, H - 6)
  }

  // Nombre del archivo
  const periodStr = `${weekStart.toISOString().split('T')[0]}_${weekEnd.toISOString().split('T')[0]}`
  const safeName = workspaceName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  doc.save(`bocadi-reporte-${safeName}-${periodStr}.pdf`)
}
