import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import * as XLSX from 'xlsx'
import './style.css'

const id = () => String(Date.now()) + '-' + String(Math.random()).slice(2)
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateOnly = (iso) => String(iso).slice(0, 10)

const starterProducts = [
  { id: id(), code: '7891000100103', name: 'Arroz 5kg', price: 28.9, cost: 22, stock: 12 },
  { id: id(), code: '7891000200209', name: 'Feijão 1kg', price: 8.5, cost: 6, stock: 20 },
  { id: id(), code: '7891000300305', name: 'Açúcar 1kg', price: 4.9, cost: 3.5, stock: 18 }
]

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [screen, setScreen] = useState('home')
  const [products, setProducts] = useState(() => load('pdv_products', starterProducts))
  const [sales, setSales] = useState(() => load('pdv_sales', []))
  const [dark, setDark] = useState(() => load('pdv_dark', false))

  useEffect(() => localStorage.setItem('pdv_products', JSON.stringify(products)), [products])
  useEffect(() => localStorage.setItem('pdv_sales', JSON.stringify(sales)), [sales])
  useEffect(() => localStorage.setItem('pdv_dark', JSON.stringify(dark)), [dark])
  useEffect(() => { document.body.className = dark ? 'dark' : '' }, [dark])

  if (screen === 'seller') {
    return <Seller products={products} setProducts={setProducts} sales={sales} setSales={setSales} setScreen={setScreen} dark={dark} setDark={setDark} />
  }

  if (screen === 'login') {
    return <ManagerLogin setScreen={setScreen} />
  }

  if (screen === 'manager') {
    return <Manager products={products} setProducts={setProducts} sales={sales} setSales={setSales} setScreen={setScreen} dark={dark} setDark={setDark} />
  }

  return <Home setScreen={setScreen} />
}

function Home({ setScreen }) {
  return (
    <div className="home">
      <section className="hero">
        <h1>PDV Mercado</h1>
        <p>Sistema simples para mercado pequeno</p>
        <div className="actions">
          <button onClick={() => setScreen('seller')}>Entrar como vendedor</button>
          <button className="secondary" onClick={() => setScreen('login')}>Entrar como gerente</button>
        </div>
      </section>
    </div>
  )
}

function Header({ title, setScreen, dark, setDark }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <span>PDV Mercado</span>
      </div>
      <div className="actions">
        <button className="mini ghost" onClick={() => setDark(!dark)}>{dark ? 'Claro' : 'Escuro'}</button>
        <button className="mini exit" onClick={() => setScreen('home')}>Sair</button>
      </div>
    </header>
  )
}

function ManagerLogin({ setScreen }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function enter() {
    if (password === '1234') setScreen('manager')
    else setError('Senha incorreta')
  }

  return (
    <main className="page centered">
      <section className="card login">
        <h2>Gerente</h2>
        <input type="password" placeholder="Senha 1234" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enter()} />
        {error && <p className="error">{error}</p>}
        <button onClick={enter}>Entrar</button>
        <button className="ghost" onClick={() => setScreen('home')}>Voltar</button>
      </section>
    </main>
  )
}

function Seller({ products, setProducts, sales, setSales, setScreen, dark, setDark }) {
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState([])
  const [payment, setPayment] = useState('dinheiro')
  const [creditMode, setCreditMode] = useState('à vista')
  const [message, setMessage] = useState('')

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return products.filter(p => p.name.toLowerCase().includes(q) || p.code.includes(q)).slice(0, 5)
  }, [search, products])

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  function addProduct(product) {
    const item = product || suggestions[0]
    const amount = Number(qty)

    if (!item) return setMessage('Produto não encontrado.')
    if (!amount || amount <= 0) return setMessage('Quantidade inválida.')

    const inCart = cart.find(c => c.id === item.id)
    const currentQty = inCart ? inCart.qty : 0

    if (currentQty + amount > item.stock) {
      return setMessage(`A quantidade de ${item.name} passou do limite disponível.`)
    }

    if (inCart) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + amount } : c))
    } else {
      setCart([...cart, { ...item, qty: amount }])
    }

    setSearch('')
    setQty(1)
    setMessage('')
  }

  function finishSale() {
    if (!cart.length) return setMessage('Carrinho vazio.')

    const sale = {
      id: id(),
      date: new Date().toISOString(),
      items: cart,
      payment,
      creditMode: payment === 'crédito' ? creditMode : '',
      total
    }

    setSales([sale, ...sales])
    setProducts(products.map(p => {
      const item = cart.find(c => c.id === p.id)
      return item ? { ...p, stock: p.stock - item.qty } : p
    }))

    setCart([])
    setSearch('')
    setQty(1)
    setMessage('Venda finalizada com sucesso!')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <main className="page">
      <Header title="Área do Vendedor" setScreen={setScreen} dark={dark} setDark={setDark} />

      <section className="grid">
        <div className="card">
          <h2>Caixa</h2>

          <label>Buscar produto</label>
          <input placeholder="Código de barras ou nome" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />

          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map(p => (
                <button key={p.id} className="suggestion" onClick={() => addProduct(p)}>
                  <strong>{p.name}</strong>
                  <span>{p.code}</span>
                  <b>{money(p.price)}</b>
                </button>
              ))}
            </div>
          )}

          <label>Quantidade</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />

          <button onClick={() => addProduct()}>Adicionar ao carrinho</button>

          {message && <p className={message.includes('sucesso') ? 'success' : 'error'}>{message}</p>}
        </div>

        <div className="card">
          <h2>Carrinho</h2>

          <div className="list">
            {cart.map(item => (
              <div className="row-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.qty} x {money(item.price)}</small>
                </div>
                <div className="right">
                  <b>{money(item.qty * item.price)}</b>
                  <button className="mini danger" onClick={() => setCart(cart.filter(c => c.id !== item.id))}>Cancelar</button>
                </div>
              </div>
            ))}

            {cart.length === 0 && <p className="muted">Nenhum produto no carrinho.</p>}
          </div>

          <div className="total">Total: {money(total)}</div>

          <label>Pagamento</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option>dinheiro</option>
            <option>débito</option>
            <option>crédito</option>
            <option>pix</option>
          </select>

          {payment === 'crédito' && (
            <select value={creditMode} onChange={(e) => setCreditMode(e.target.value)}>
              <option>à vista</option>
              <option>parcelado 2x</option>
              <option>parcelado 3x</option>
              <option>parcelado 4x</option>
              <option>parcelado 5x</option>
              <option>parcelado 6x</option>
            </select>
          )}

          <div className="actions">
            <button onClick={finishSale}>Finalizar venda</button>
            <button className="ghost" onClick={() => window.print()}>Imprimir cupom</button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Manager({ products, setProducts, sales, setSales, setScreen, dark, setDark }) {
  const [form, setForm] = useState({ code: '', name: '', price: '', cost: '', stock: '' })
  const [showValues, setShowValues] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filteredSales = sales.filter(s => {
    const d = dateOnly(s.date)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const stockValue = products.reduce((sum, p) => sum + Number(p.cost || 0) * Number(p.stock || 0), 0)

  function saveProduct() {
    if (!form.code || !form.name || !form.price) {
      alert('Preencha código, nome e preço.')
      return
    }

    const exists = products.find(p => p.code === form.code)
    const newProduct = {
      id: exists ? exists.id : id(),
      code: form.code,
      name: form.name,
      price: Number(form.price),
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0)
    }

    if (exists) {
      const ok = confirm('Código já existente. Deseja atualizar esse produto/estoque?')
      if (!ok) return
      setProducts(products.map(p => p.code === form.code ? newProduct : p))
    } else {
      setProducts([newProduct, ...products])
    }

    setForm({ code: '', name: '', price: '', cost: '', stock: '' })
  }

  function exportExcel() {
    const rows = filteredSales.map(s => ({
      Data: new Date(s.date).toLocaleString('pt-BR'),
      Pagamento: s.payment,
      Credito: s.creditMode,
      Total: s.total,
      Produtos: s.items.map(i => `${i.name} (${i.qty})`).join(', ')
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
    XLSX.writeFile(wb, 'vendas-pdv.xlsx')
  }

  function exportGoogleCsv() {
    const rows = filteredSales.map(s => ({
      Data: new Date(s.date).toLocaleString('pt-BR'),
      Pagamento: s.payment,
      Credito: s.creditMode,
      Total: s.total,
      Produtos: s.items.map(i => `${i.name} (${i.qty})`).join(' | ')
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'vendas-google-planilhas.csv'
    a.click()
    window.open('https://docs.google.com/spreadsheets/u/0/', '_blank')
  }

  function backup() {
    const blob = new Blob([JSON.stringify({ products, sales }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'backup-pdv.json'
    a.click()
  }

  return (
    <main className="page">
      <Header title="Área do Gerente" setScreen={setScreen} dark={dark} setDark={setDark} />

      <section className="dashboard">
        <div className="stat"><span>Vendas</span><b>{filteredSales.length}</b></div>
        <div className="stat"><span>Faturamento</span><b>{showValues ? money(revenue) : '••••'}</b></div>
        <div className="stat"><span>Valor em estoque</span><b>{showValues ? money(stockValue) : '••••'}</b></div>
        <button className="ghost" onClick={() => setShowValues(!showValues)}>{showValues ? 'Ocultar valores' : 'Mostrar valores'}</button>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Cadastrar produto</h2>
          <input placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" placeholder="Preço de venda" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input type="number" placeholder="Custo" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <input type="number" placeholder="Estoque" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveProduct()} />
          <button onClick={saveProduct}>Salvar produto</button>
        </div>

        <div className="card">
          <h2>Estoque</h2>
          <div className="list">
            {products.map(p => (
              <div className="row-item" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.code} | estoque: {p.stock}</small>
                </div>
                <div className="right">
                  <b>{money(p.price)}</b>
                  <button className="mini danger" onClick={() => setProducts(products.filter(x => x.id !== p.id))}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Registro de vendas</h2>

        <div className="filters">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="ghost" onClick={() => { setFrom(''); setTo('') }}>Mostrar todas</button>
          <button onClick={exportExcel}>Exportar Excel</button>
          <button onClick={exportGoogleCsv}>Google Planilhas</button>
          <button className="secondary" onClick={backup}>Backup</button>
        </div>

        <div className="list">
          {filteredSales.map(s => (
            <div className="sale" key={s.id}>
              <strong>{new Date(s.date).toLocaleString('pt-BR')}</strong>
              <span>{s.payment} {s.creditMode}</span>
              <b>{money(s.total)}</b>
            </div>
          ))}
          {filteredSales.length === 0 && <p className="muted">Nenhuma venda encontrada.</p>}
        </div>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)