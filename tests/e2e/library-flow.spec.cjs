const { test, expect } = require('@playwright/test')

const pages = [
  ['Catálogo', 'Catálogo', '/libros'],
  ['Socios', 'Socios', '/socios'],
  ['Prestar', 'Prestar', '/prestar'],
  ['Préstamos', 'Préstamos', '/prestamos'],
  ['Vencidos', 'Vencidos', '/vencidos'],
  ['Reporte', 'Libros más prestados', '/reporte'],
]

async function signIn(page) {
  await page.goto('/')
  const device = page.viewportSize().width <= 640 ? 'mobile' : 'desktop'
  await page.screenshot({ path: `test-results/${device}-login.png`, fullPage: true })
  await page.getByLabel('Usuario').fill(process.env.E2E_ADMIN_USERNAME)
  await page.getByLabel('Contraseña').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/libros$/)
}

test('admin completes the seven-screen library flow on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible()
  await expect(page.getByRole('row').nth(1)).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-libros.png', fullPage: true })

  const suffix = Date.now().toString()
  const memberName = `E2E Socio ${suffix}`
  const documentNumber = `E2E-${suffix}`
  const bookTitle = `E2E Libro ${suffix}`

  await page.getByRole('link', { name: 'Socios' }).click()
  const memberForm = page.locator('form.card.row').nth(1)
  await memberForm.getByLabel('Nombre completo').fill(memberName)
  await memberForm.getByLabel('Documento').fill(documentNumber)
  await memberForm.getByRole('button', { name: 'Crear socio' }).click()
  await expect(page.getByText('Socio creado.')).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-socios.png', fullPage: true })

  await page.getByRole('link', { name: 'Catálogo' }).click()
  const bookForm = page.locator('form.card.row').nth(1)
  await bookForm.getByLabel('Título').fill(bookTitle)
  await bookForm.getByLabel('Autor').fill('Prueba automatizada')
  await bookForm.getByLabel('ISBN').fill('9781234567897')
  await bookForm.getByLabel('Categoría').selectOption({ label: 'Ciencia' })
  await bookForm.getByLabel('Ejemplares').fill('1')
  await bookForm.getByRole('button', { name: 'Crear libro' }).click()
  await expect(page.getByText('Libro creado.')).toBeVisible()

  await page.getByRole('link', { name: 'Prestar' }).click()
  // The adjacent search input is also labelled "Buscar socio"; target the dropdown directly.
  const memberSelect = page.locator('select').first()
  const memberOption = memberSelect.locator('option').filter({ hasText: memberName })
  await expect(memberOption).toHaveCount(1)
  await memberSelect.selectOption(await memberOption.getAttribute('value'))
  const bookSearchForm = page.locator('form.card.row')
  await bookSearchForm.getByLabel('Buscar libro').fill(bookTitle)
  await bookSearchForm.getByRole('button', { name: 'Buscar' }).click()
  const bookRow = page.getByRole('row').filter({ hasText: bookTitle })
  await bookRow.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Registrar préstamo' }).click()
  await expect(page.getByText(/Préstamo registrado/)).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-prestar.png', fullPage: true })

  for (const [linkName, heading, path] of pages.slice(3)) {
    await page.getByRole('link', { name: linkName }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    if (linkName === 'Préstamos') {
      const loan = page.locator('.card').filter({ hasText: bookTitle })
      await expect(loan).toBeVisible()
      await loan.getByRole('button', { name: 'Devolver' }).click()
      await expect(page.getByText('Devolución registrada.')).toBeVisible()
    }
    if (linkName === 'Vencidos') {
      await expect(page.getByRole('row').nth(1)).toBeVisible()
    }
    if (linkName === 'Reporte') {
      await page.getByRole('button', { name: 'Generar' }).click()
      await expect(page.getByText('Ese rango no tiene préstamos.')).toHaveCount(0)
    }
    await page.screenshot({ path: `test-results/desktop-${path.slice(1)}.png`, fullPage: true })
  }
})

test('authenticated navigation remains within the viewport on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)

  for (const [linkName, heading, path] of pages) {
    await page.getByRole('link', { name: linkName }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1)
    await page.screenshot({ path: `test-results/mobile-${path.slice(1)}.png`, fullPage: true })
  }
})
