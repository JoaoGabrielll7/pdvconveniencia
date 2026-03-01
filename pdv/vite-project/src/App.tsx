import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleRight, faArrowRightFromBracket, faGear, faSackDollar, faTriangleExclamation, faUser } from '@fortawesome/free-solid-svg-icons'
import { faUsers } from '@fortawesome/free-solid-svg-icons'
import { faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons'
import { faExpand } from '@fortawesome/free-solid-svg-icons'
import { faCompress } from '@fortawesome/free-solid-svg-icons'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { faAngleDown } from '@fortawesome/free-solid-svg-icons'
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { faPrint } from '@fortawesome/free-solid-svg-icons'
import { faTag } from '@fortawesome/free-solid-svg-icons'
import { faChartColumn, faCartShopping, faMoneyBillWave, faBoxOpen, faList, faUserGroup, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { faHashtag, faPhone, faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

// Sessao: tipos principais da aplicacao.
type ViewKey = 'dashboard' | 'venda' | 'caixa' | 'clientes' | 'produtos' | 'baixo-estoque' | 'usuarios' | 'fornecedores' | 'historico' | 'impressoras' | 'backup' | 'licenca' | 'perfil';
type ApiResponse<T> = { success: boolean; data: T; message?: string; code?: string };
type User = { id: string; email: string; nome: string; role: string };
type Produto = { id: string; nome: string; codigo: string | null; preco: number | string; estoque: number };
type ProdutoListResponse = { dados: Produto[] };
type Venda = { id: string; total: number | string; createdAt: string; itens: Array<{ quantidade: number }> };
type VendaListResponse = { dados: Venda[] };
type VendaView = Venda & {
  cliente: string;
  pagamento: string;
  statusVenda: 'Concluída' | 'Cancelada';
  operador: string;
  itensTotal: number;
};
type CartItem = { produto: Produto; quantidade: number };
type VendaCaixa = { id: string; itens: CartItem[] };
type PaymentType = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
type PaymentLine = {
  id: string;
  tipo: PaymentType;
  valor: string;
  valorRecebido: string;
  parcelas: number;
  confirmado: boolean;
};
type CashEntry = {
  id: string;
  tipo: 'ABERTURA' | 'VENDA' | 'SUPRIMENTO' | 'SANGRIA' | 'FECHAMENTO';
  descricao: string;
  total: number;
  data: string;
  operadorId?: string;
  operadorNome?: string;
};
type Cliente = { id: string; nome: string; celular: string; limiteTotal: number; creditoUso: number; status: 'Ativo' | 'Bloqueado' };
type Usuario = {
  id: string;
  nome: string;
  email: string;
  celular: string;
  permissao: 'Nenhum' | 'Administrador' | 'Funcionario';
  dataNascimento?: string;
  documento?: string;
  tipoPessoa?: 'PF' | 'PJ';
};
type UsuarioApi = {
  id: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'CAIXA';
  ativo: boolean;
  criadoEm: string;
  ultimoLogin: string | null;
};
type UsuarioListResponse = { dados: UsuarioApi[]; total: number; page: number; totalPages: number };
type Fornecedor = { id: string; nome: string; email: string; celular: string; createdAt?: string };
type FornecedorApi = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  createdAt: string;
};
type FornecedorListResponse = { dados: FornecedorApi[]; total: number; page: number; totalPages: number };
type AccountStartView = 'dashboard' | 'venda' | 'caixa' | 'historico';
type AccountSettings = {
  startView: AccountStartView;
  historyPageSize: 10 | 25 | 50 | 100;
  confirmLogout: boolean;
  collapsedMenu: boolean;
};
type CaixaHistoricoFilters = {
  operadorId?: string;
  dataInicio?: string;
  dataFim?: string;
};
type KpiCardKey = 'vendas' | 'produtos' | 'baixo' | 'usuarios';
type AdminDeleteTarget = {
  kind: 'usuario' | 'fornecedor';
  id: string;
  label: string;
};
type BackupData = {
  version: 1;
  createdAt: string;
  data: {
    produtos: Produto[];
    vendas: Venda[];
    cashEntries: CashEntry[];
    saldoCaixa: number;
    caixaAberto: boolean;
    clientes: Cliente[];
    usuarios: Usuario[];
    fornecedores: Fornecedor[];
    printerName: string;
    autoPrint: boolean;
  };
};
type LocalBackupFolder = {
  folderName: string;
  backups: BackupData[];
};
type ProfileMetadata = {
  celular: string;
  dataNascimento: string;
  documento: string;
  tipoPessoa: 'PF' | 'PJ';
};
type LocalLicenseStatus = {
  id: string;
  ativo: boolean;
  bloqueado: boolean;
  diasRestantes: number;
  aviso: boolean;
  dataAtivacao: string;
  dataExpiracao: string;
  ultimaRenovacao: string | null;
  tentativasBloqueio: number;
  ultimoBloqueioEm: string | null;
  validadeDias: number;
  avisoDias: number;
};
type LicensePlanType = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
type CreatedUserLicense = {
  id: string;
  licenseKey: string;
  planType: LicensePlanType;
  maxDevices: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  user?: { id: string; nome: string; email: string; role: string } | null;
};

// Sessao: utilitarios globais de formato, data e persistencia local.
const normalizeApiBase = (raw?: string): string => {
  const base = (raw ?? '').trim();
  if (!base) return '/api';
  const cleaned = base.replace(/\/+$/, '');
  if (cleaned.endsWith('/api') || cleaned.includes('/api/')) return cleaned;
  return `${cleaned}/api`;
};
const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL);
const apiFallbackBase = '/api';
const uid = (): string => Math.random().toString(36).slice(2, 10);
const money = (v: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const moneyField = (v: number): string => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const toNum = (v: number | string): number => (typeof v === 'number' ? v : Number(v));
const moneyInput = (v: string): number => Number(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const amount = Number(digits || '0') / 100;
  return `R$ ${moneyField(amount)}`;
};
const formatMoneyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const amount = Number(digits || '0') / 100;
  return moneyField(amount);
};
const percentInput = (value: string): number => {
  let normalized = value.replace(/\s/g, '').replace('%', '');
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  normalized = normalized.replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
const formatPercentInput = (value: string): string => moneyField(percentInput(value));
const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const roleToPermissao = (role: string): Usuario['permissao'] => (role === 'ADMIN' ? 'Administrador' : 'Funcionario');
const permissaoToRole = (permissao: Usuario['permissao']): 'ADMIN' | 'CAIXA' => (permissao === 'Administrador' ? 'ADMIN' : 'CAIXA');
const saveJson = <T,>(k: string, v: T): void => localStorage.setItem(k, JSON.stringify(v));
const loadJson = <T,>(k: string, f: T): T => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : f;
  } catch {
    return f;
  }
};
const BACKUP_STORAGE_KEY = 'pdv_backups';
const DEFAULT_BACKUP_FOLDER_NAME = 'PDV-Backups-Local';
const ACCOUNT_SETTINGS_KEY = 'pdv_account_settings';
const PROFILE_META_KEY = 'pdv_profile_meta';
const LOCAL_LICENSE_BLOCKED_EVENT = 'pdv:local-license-blocked';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  startView: 'dashboard',
  historyPageSize: 10,
  confirmLogout: true,
  collapsedMenu: false,
};

const normalizeAccountSettings = (settings?: Partial<AccountSettings> | null): AccountSettings => {
  const safeStartView: AccountStartView =
    settings?.startView && ['dashboard', 'venda', 'caixa', 'historico'].includes(settings.startView)
      ? settings.startView
      : DEFAULT_ACCOUNT_SETTINGS.startView;
  const safeHistoryPageSize = settings?.historyPageSize && [10, 25, 50, 100].includes(settings.historyPageSize)
    ? settings.historyPageSize
    : DEFAULT_ACCOUNT_SETTINGS.historyPageSize;
  return {
    startView: safeStartView,
    historyPageSize: safeHistoryPageSize,
    confirmLogout: typeof settings?.confirmLogout === 'boolean' ? settings.confirmLogout : DEFAULT_ACCOUNT_SETTINGS.confirmLogout,
    collapsedMenu: typeof settings?.collapsedMenu === 'boolean' ? settings.collapsedMenu : DEFAULT_ACCOUNT_SETTINGS.collapsedMenu,
  };
};

const loadAccountSettings = (): AccountSettings => normalizeAccountSettings(loadJson<AccountSettings>(ACCOUNT_SETTINGS_KEY, DEFAULT_ACCOUNT_SETTINGS));
const toDateInput = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const fromDateInput = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const toIsoDateTime = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();
const idHash = (value: string): number => [...value].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
const loadLocalBackupFolder = (): LocalBackupFolder => {
  const fallback: LocalBackupFolder = { folderName: DEFAULT_BACKUP_FOLDER_NAME, backups: [] };
  const raw = loadJson<LocalBackupFolder | BackupData[]>(BACKUP_STORAGE_KEY, fallback);
  if (Array.isArray(raw)) {
    return { folderName: fallback.folderName, backups: raw };
  }
  return {
    folderName: typeof raw.folderName === 'string' && raw.folderName.trim() ? raw.folderName : fallback.folderName,
    backups: Array.isArray(raw.backups) ? raw.backups : [],
  };
};
const backupFileNameFromDate = (createdAt: string, index: number): string => {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return `backup-local-${index + 1}.json`;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');
  const sec = String(parsed.getSeconds()).padStart(2, '0');
  return `backup-local-${yyyy}${mm}${dd}-${hh}${min}${sec}.json`;
};

// Sessao: parse seguro para respostas da API.
async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    const emptyErrorMessage =
      res.status >= 500
        ? `Resposta vazia da API (HTTP ${res.status}). Verifique se o backend está ativo e se o proxy /api está correto.`
        : `Resposta vazia da API (HTTP ${res.status})`;
    return {
      success: res.ok,
      data: null as T,
      message: res.ok ? undefined : emptyErrorMessage,
    };
  }
  try {
    const parsed = JSON.parse(trimmed) as ApiResponse<T>;
    if (typeof parsed.success !== 'boolean') {
      return {
        success: res.ok,
        data: parsed as T,
        message: res.ok ? undefined : `HTTP ${res.status}`,
      };
    }
    return parsed;
  } catch {
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      throw new Error('Resposta HTML recebida da API. Verifique VITE_API_URL/proxy para /api.');
    }
    if (!res.ok) {
      throw new Error(trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed);
    }
    return {
      success: true,
      data: trimmed as T,
      message: undefined,
    };
  }
}

// Sessao: cliente HTTP com fallback automatico para /api.
async function requestApi<T>(path: string, init?: RequestInit): Promise<{ res: Response; json: ApiResponse<T> }> {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const notifyLocalLicenseBlocked = (res: Response, json: ApiResponse<T>): void => {
    if (typeof window === 'undefined') return;
    if (res.status !== 423 || json.code !== 'LOCAL_LICENSE_BLOCKED') return;
    const detail = (json.data && typeof json.data === 'object') ? (json.data as unknown as LocalLicenseStatus) : null;
    window.dispatchEvent(new CustomEvent<LocalLicenseStatus | null>(LOCAL_LICENSE_BLOCKED_EVENT, { detail }));
  };
  let primaryRes: Response;
  try {
    primaryRes = await fetch(`${apiBase}${endpoint}`, init);
  } catch {
    if (apiBase !== apiFallbackBase) {
      const fallbackRes = await fetch(`${apiFallbackBase}${endpoint}`, init);
      const fallbackJson = await parseApiResponse<T>(fallbackRes);
      notifyLocalLicenseBlocked(fallbackRes, fallbackJson);
      return { res: fallbackRes, json: fallbackJson };
    }
    throw new Error('Não foi possível conectar à API. Verifique se o backend está rodando.');
  }
  try {
    const primaryJson = await parseApiResponse<T>(primaryRes);
    notifyLocalLicenseBlocked(primaryRes, primaryJson);
    return { res: primaryRes, json: primaryJson };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Resposta HTML recebida da API')) {
      throw new Error(`Backend sem resposta JSON em ${endpoint}. Reinicie/atualize o backend e confira o proxy /api.`);
    }
    if (apiBase !== apiFallbackBase) {
      const fallbackRes = await fetch(`${apiFallbackBase}${endpoint}`, init);
      const fallbackJson = await parseApiResponse<T>(fallbackRes);
      notifyLocalLicenseBlocked(fallbackRes, fallbackJson);
      return { res: fallbackRes, json: fallbackJson };
    }
    throw error;
  }
}

function App() {
  // Sessao: estado de autenticacao e navegacao principal.
  const [email, setEmail] = useState('admin@conveniencia.com');
  const [senha, setSenha] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showSenha, setShowSenha] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [productsMenuOpen, setProductsMenuOpen] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [openingCashLoading, setOpeningCashLoading] = useState(false);
  const [searchVenda, setSearchVenda] = useState('');
  const [vendaSuggestions, setVendaSuggestions] = useState<Produto[]>([]);
  const [loadingVendaSuggestions, setLoadingVendaSuggestions] = useState(false);
  const [activeVendaSuggestionIndex, setActiveVendaSuggestionIndex] = useState(-1);
  const [searchGrid, setSearchGrid] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<'hoje' | '7d' | '30d' | 'custom'>('7d');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyMinValue] = useState('');
  const [historyMaxValue] = useState('');
  const [historyCliente] = useState('todos');
  const [historySearch] = useState('');
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedVenda, setSelectedVenda] = useState<VendaView | null>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState<'7d' | '30d' | 'mes' | 'ano'>('30d');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [localLicenseStatus, setLocalLicenseStatus] = useState<LocalLicenseStatus | null>(null);
  const [localLicenseLoading, setLocalLicenseLoading] = useState(true);
  const [localLicenseRenewPassword, setLocalLicenseRenewPassword] = useState('');
  const [localLicenseRenewLoading, setLocalLicenseRenewLoading] = useState(false);
  const [localLicenseCurrentPassword, setLocalLicenseCurrentPassword] = useState('');
  const [localLicenseNewPassword, setLocalLicenseNewPassword] = useState('');
  const [localLicensePasswordLoading, setLocalLicensePasswordLoading] = useState(false);
  const [licenseUserId, setLicenseUserId] = useState('');
  const [licensePlanType, setLicensePlanType] = useState<LicensePlanType>('MONTHLY');
  const [licenseMaxDevices, setLicenseMaxDevices] = useState('1');
  const [licenseValidityDays, setLicenseValidityDays] = useState('40');
  const [licenseCreateLoading, setLicenseCreateLoading] = useState(false);
  const [lastCreatedUserLicense, setLastCreatedUserLicense] = useState<CreatedUserLicense | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [localBackupFolderName, setLocalBackupFolderName] = useState(DEFAULT_BACKUP_FOLDER_NAME);
  const [restoreBackupCandidates, setRestoreBackupCandidates] = useState<BackupData[]>([]);
  const [showRestoreBackupModal, setShowRestoreBackupModal] = useState(false);

  // Sessao: estado operacional de produtos, vendas e caixas simultaneos.
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendaCaixas, setVendaCaixas] = useState<VendaCaixa[]>([{ id: uid(), itens: [] }]);
  const [activeVendaCaixaIndex, setActiveVendaCaixaIndex] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteCaixaModal, setShowDeleteCaixaModal] = useState(false);
  const [deleteCaixaIndex, setDeleteCaixaIndex] = useState<number | null>(null);
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [pendingAdminDelete, setPendingAdminDelete] = useState<AdminDeleteTarget | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [clearingHistoryLoading, setClearingHistoryLoading] = useState(false);
  const [saleDiscount, setSaleDiscount] = useState('0,00');
  const [saleCpf, setSaleCpf] = useState('');
  const [saleCliente, setSaleCliente] = useState('');
  const [salePaymentDate, setSalePaymentDate] = useState(toDateInput(new Date()));
  const [saleObs, setSaleObs] = useState('');
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: uid(), tipo: 'DINHEIRO', valor: '0,00', valorRecebido: '0,00', parcelas: 1, confirmado: true },
  ]);

  // Sessao: estado de caixa financeiro.
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [caixaReportFrom, setCaixaReportFrom] = useState('');
  const [caixaReportTo, setCaixaReportTo] = useState('');
  const [caixaReportOperadorId, setCaixaReportOperadorId] = useState('todos');
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [openCashDescricao, setOpenCashDescricao] = useState('Saldo inicial');
  const [openCashValor, setOpenCashValor] = useState('0,00');
  const [openCashSemValor, setOpenCashSemValor] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState<null | 'SUPRIMENTO' | 'SANGRIA'>(null);
  const [flowDescricao, setFlowDescricao] = useState('');
  const [flowValor, setFlowValor] = useState('0,00');

  // Sessao: estado de entidades administrativas.
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  // Sessao: estado de cadastro de clientes (ainda local, pendente migracao para API).
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCelular, setClienteCelular] = useState('');
  const [clienteLimite, setClienteLimite] = useState('0,00');

  // Sessao: estado de formulario de usuarios.
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);
  const [editingUsuarioId, setEditingUsuarioId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [usuarioCelular, setUsuarioCelular] = useState('');
  const [usuarioPermissao, setUsuarioPermissao] = useState<Usuario['permissao']>('Nenhum');
  const [usuarioDataNascimento, setUsuarioDataNascimento] = useState('');
  const [usuarioDocumento, setUsuarioDocumento] = useState('');
  const [usuarioTipoPessoa, setUsuarioTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [usuarioSenha, setUsuarioSenha] = useState('');
  const [usuarioSenhaConfirm, setUsuarioSenhaConfirm] = useState('');

  // Sessao: estado de formulario de fornecedores.
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [editingFornecedorId, setEditingFornecedorId] = useState<string | null>(null);
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorEmail, setFornecedorEmail] = useState('');
  const [fornecedorCelular, setFornecedorCelular] = useState('');

  // Sessao: estado de cadastro/edicao de produtos.
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showEditProdutoModal, setShowEditProdutoModal] = useState(false);
  const [editingProdutoId, setEditingProdutoId] = useState<string | null>(null);
  const [showPrintProdutoModal, setShowPrintProdutoModal] = useState(false);
  const [produtoToPrint, setProdutoToPrint] = useState<Produto | null>(null);
  const [produtoFormTab, setProdutoFormTab] = useState<'geral' | 'mais'>('geral');
  const [produtoNome, setProdutoNome] = useState('');
  const [produtoCodigo, setProdutoCodigo] = useState('');
  const [produtoPreco, setProdutoPreco] = useState('R$ 0,00');
  const [produtoPrecoFardo, setProdutoPrecoFardo] = useState('0,00');
  const [produtoQtdFardo, setProdutoQtdFardo] = useState('5');
  const [produtoMargemManual, setProdutoMargemManual] = useState('50,00');
  const [produtoPricingMode, setProdutoPricingMode] = useState<'margem' | 'preco'>('margem');
  const [produtoEstoque, setProdutoEstoque] = useState('0');
  const [produtoEstoqueMinimo, setProdutoEstoqueMinimo] = useState('1');
  const [produtoValidade, setProdutoValidade] = useState('');
  const [produtoCategorias, setProdutoCategorias] = useState<string[]>(['Nenhum']);
  const [produtoCategoria, setProdutoCategoria] = useState('Nenhum');
  const [produtoDescricao, setProdutoDescricao] = useState('');
  const [produtoMarcas, setProdutoMarcas] = useState<string[]>(['Nenhum']);
  const [produtoMarca, setProdutoMarca] = useState('Nenhum');
  const [produtoLote, setProdutoLote] = useState('');
  const [produtoFornecedor, setProdutoFornecedor] = useState('');
  const [showAddCategoriaModal, setShowAddCategoriaModal] = useState(false);
  const [showAddMarcaModal, setShowAddMarcaModal] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaMarca, setNovaMarca] = useState('');

  // Sessao: estado de preferncias de impressao e utilitarios da UI.
  const [printerName, setPrinterName] = useState('Impressora termica 80mm');
  const [autoPrint, setAutoPrint] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingProfileInfo, setEditingProfileInfo] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCelular, setProfileCelular] = useState('');
  const [profileDataNascimento, setProfileDataNascimento] = useState('');
  const [profileDocumento, setProfileDocumento] = useState('');
  const [profileTipoPessoa, setProfileTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [currentSenha, setCurrentSenha] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [accountStartView, setAccountStartView] = useState<AccountStartView>('dashboard');
  const [accountHistoryPageSize, setAccountHistoryPageSize] = useState<10 | 25 | 50 | 100>(10);
  const [accountConfirmLogout, setAccountConfirmLogout] = useState(true);
  const [accountCollapsedMenu, setAccountCollapsedMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  // Sessao: calculos derivados para venda, dashboard e filtros.
  const profileHandle = useMemo(() => {
    const base = (profileNome || user?.nome || 'operador').trim().toLowerCase().replace(/\s+/g, '_');
    return base ? `@${base}` : '@operador';
  }, [profileNome, user?.nome]);
  const cart = useMemo(() => vendaCaixas[activeVendaCaixaIndex]?.itens ?? [], [vendaCaixas, activeVendaCaixaIndex]);
  const deleteCaixaNumero = deleteCaixaIndex !== null ? deleteCaixaIndex + 1 : activeVendaCaixaIndex + 1;
  const deleteCaixaItens = useMemo(
    () => (deleteCaixaIndex === null ? 0 : (vendaCaixas[deleteCaixaIndex]?.itens ?? []).reduce((sum, item) => sum + item.quantidade, 0)),
    [deleteCaixaIndex, vendaCaixas]
  );
  const totalCarrinho = useMemo(() => cart.reduce((s, i) => s + toNum(i.produto.preco) * i.quantidade, 0), [cart]);
  const produtoPrecoVendaNumero = useMemo(() => moneyInput(produtoPreco), [produtoPreco]);
  const produtoPrecoFardoNumero = useMemo(() => moneyInput(produtoPrecoFardo), [produtoPrecoFardo]);
  const produtoQtdFardoNumero = useMemo(() => Math.max(0, Number(produtoQtdFardo.replace(',', '.')) || 0), [produtoQtdFardo]);
  const produtoMargemManualNumero = useMemo(() => percentInput(produtoMargemManual), [produtoMargemManual]);
  const produtoCustoUnidadeNumero = useMemo(
    () => (produtoQtdFardoNumero > 0 ? produtoPrecoFardoNumero / produtoQtdFardoNumero : 0),
    [produtoPrecoFardoNumero, produtoQtdFardoNumero]
  );
  const produtoMargemReaisNumero = useMemo(
    () => Math.max(0, produtoPrecoVendaNumero - produtoCustoUnidadeNumero),
    [produtoPrecoVendaNumero, produtoCustoUnidadeNumero]
  );
  const produtoPrecoSugeridoNumero = useMemo(
    () => (produtoCustoUnidadeNumero > 0 ? produtoCustoUnidadeNumero * (1 + produtoMargemManualNumero / 100) : 0),
    [produtoCustoUnidadeNumero, produtoMargemManualNumero]
  );
  const produtoPrecoSugeridoLabel = useMemo(() => moneyField(produtoPrecoSugeridoNumero), [produtoPrecoSugeridoNumero]);
  const produtoCustoUnidadeLabel = useMemo(() => moneyField(produtoCustoUnidadeNumero), [produtoCustoUnidadeNumero]);
  const produtoMargemReaisLabel = useMemo(() => moneyField(produtoMargemReaisNumero), [produtoMargemReaisNumero]);
  const localLicenseBlocked = Boolean(localLicenseStatus?.bloqueado);
  const localLicenseWarn = Boolean(localLicenseStatus?.aviso);
  const localLicenseExpirationLabel = useMemo(() => {
    if (!localLicenseStatus?.dataExpiracao) return '-';
    const parsed = new Date(localLicenseStatus.dataExpiracao);
    return Number.isNaN(parsed.getTime()) ? localLicenseStatus.dataExpiracao : parsed.toLocaleString('pt-BR');
  }, [localLicenseStatus?.dataExpiracao]);
  const licenseUserOptions = useMemo(
    () => [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome)),
    [usuarios]
  );
  const isAdmin = user?.role === 'ADMIN';
  const isCaixa = user?.role === 'CAIXA';
  const canManageProducts = isAdmin;
  const canClearSalesHistory = isAdmin;
  const canAccessSystemSettings = isAdmin;
  const allowedViewsForCurrentRole = useMemo<ViewKey[]>(() => {
    if (isAdmin) {
      return ['dashboard', 'venda', 'caixa', 'clientes', 'produtos', 'baixo-estoque', 'usuarios', 'fornecedores', 'historico', 'impressoras', 'backup', 'licenca', 'perfil'];
    }
    if (isCaixa) {
      return ['dashboard', 'venda', 'caixa', 'produtos', 'baixo-estoque', 'historico', 'perfil'];
    }
    return ['dashboard', 'venda', 'caixa', 'historico', 'perfil'];
  }, [isAdmin, isCaixa]);
  const subtotalVenda = totalCarrinho;
  const descontoVenda = useMemo(() => Math.max(0, moneyInput(saleDiscount)), [saleDiscount]);
  const totalFinalVenda = useMemo(() => Math.max(0, subtotalVenda - descontoVenda), [subtotalVenda, descontoVenda]);
  const quantidadeItensVenda = useMemo(() => cart.reduce((sum, item) => sum + item.quantidade, 0), [cart]);
  const totalPagamentosInformados = useMemo(() => paymentLines.reduce((sum, item) => sum + moneyInput(item.valor), 0), [paymentLines]);
  const paymentMainLine = useMemo(
    () => paymentLines[0] ?? { id: uid(), tipo: 'DINHEIRO' as PaymentType, valor: '0,00', valorRecebido: '0,00', parcelas: 1, confirmado: true },
    [paymentLines]
  );
  const paymentMainValor = useMemo(() => moneyInput(paymentMainLine.valor), [paymentMainLine.valor]);
  const paymentMainRecebido = useMemo(() => moneyInput(paymentMainLine.valorRecebido), [paymentMainLine.valorRecebido]);
  const trocoVenda = useMemo(
    () => (paymentMainLine.tipo === 'DINHEIRO' ? Math.max(0, paymentMainRecebido - paymentMainValor) : 0),
    [paymentMainLine.tipo, paymentMainRecebido, paymentMainValor]
  );
  const parcelaValorLabel = useMemo(
    () => moneyField(paymentMainLine.parcelas > 0 ? totalFinalVenda / paymentMainLine.parcelas : totalFinalVenda),
    [paymentMainLine.parcelas, totalFinalVenda]
  );
  const caixaVendas = useMemo(() => cashEntries.filter((item) => item.tipo === 'VENDA'), [cashEntries]);
  const caixaSuprimentos = useMemo(() => cashEntries.filter((item) => item.tipo === 'SUPRIMENTO'), [cashEntries]);
  const caixaSangrias = useMemo(() => cashEntries.filter((item) => item.tipo === 'SANGRIA'), [cashEntries]);
  const caixaIndicadores = useMemo(() => {
    const totalDinheiro = caixaVendas.reduce((sum, item) => sum + item.total, 0);
    const totalCartao = 0;
    const totalPix = 0;
    const totalGeral = totalDinheiro + totalCartao + totalPix;
    const totalSangria = caixaSangrias.reduce((sum, item) => sum + item.total, 0);
    const totalSuprimento = caixaSuprimentos.reduce((sum, item) => sum + item.total, 0);
    const quantidadeVendas = caixaVendas.length;
    const ticketMedio = quantidadeVendas > 0 ? totalDinheiro / quantidadeVendas : 0;
    return { totalDinheiro, totalCartao, totalPix, totalGeral, totalSangria, totalSuprimento, quantidadeVendas, ticketMedio };
  }, [caixaVendas, caixaSangrias, caixaSuprimentos]);
  const caixaSpark = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, idx) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - idx));
      day.setHours(0, 0, 0, 0);
      return day;
    });
    const values = days.map((day) =>
      cashEntries
        .filter((item) => item.tipo === 'VENDA' && sameDay(new Date(item.data), day))
        .reduce((sum, item) => sum + item.total, 0)
    );
    return values.some((value) => value > 0) ? values : [1, 2, 3, 4, 5, 6, 7];
  }, [cashEntries]);
  const caixaVar = useMemo(() => {
    const prevValue = caixaSpark.length > 1 ? caixaSpark[caixaSpark.length - 2] : 0;
    const currentValue = caixaSpark.length > 0 ? caixaSpark[caixaSpark.length - 1] : 0;
    if (prevValue <= 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - prevValue) / prevValue) * 100;
  }, [caixaSpark]);
  const caixaSummaryCards = useMemo(
    () => [
      {
        key: 'vendas' as KpiCardKey,
        title: 'Total do caixa',
        value: money(saldoCaixa),
        var: caixaVar,
        icon: <FontAwesomeIcon icon={faMoneyBillWave} />,
        data: caixaSpark,
      },
      {
        key: 'produtos' as KpiCardKey,
        title: 'Total de vendas',
        value: money(caixaIndicadores.totalDinheiro),
        var: caixaVar,
        icon: <FontAwesomeIcon icon={faFileInvoiceDollar} />,
        data: caixaSpark.map((value) => value * 0.85 + 1),
      },
      {
        key: 'baixo' as KpiCardKey,
        title: 'Cartão ou Pix',
        value: money(caixaIndicadores.totalCartao + caixaIndicadores.totalPix),
        var: caixaIndicadores.totalCartao + caixaIndicadores.totalPix > 0 ? caixaVar : 0,
        icon: <FontAwesomeIcon icon={faCartShopping} />,
        data: caixaSpark.map((value) => value * 0.6 + 1),
      },
      {
        key: 'usuarios' as KpiCardKey,
        title: 'Venda líquida',
        value: money(caixaIndicadores.totalDinheiro - caixaIndicadores.totalSangria + caixaIndicadores.totalSuprimento),
        var: caixaVar,
        icon: <FontAwesomeIcon icon={faSackDollar} />,
        data: caixaSpark.map((value) => value * 0.72 + 1),
      },
    ],
    [caixaIndicadores.totalCartao, caixaIndicadores.totalDinheiro, caixaIndicadores.totalPix, caixaIndicadores.totalSangria, caixaIndicadores.totalSuprimento, caixaSpark, caixaVar, saldoCaixa]
  );

  function handleCaixaSummaryCardClick(cardKey: KpiCardKey): void {
    setError('');
    if (cardKey === 'vendas') {
      if (!caixaAberto) {
        setShowOpenCashModal(true);
        setStatus('Caixa fechado: abra o caixa para iniciar as movimentações');
        return;
      }
      setSearchGrid('');
      setStatus('Visão geral do caixa exibida');
      return;
    }

    if (cardKey === 'produtos') {
      setSearchGrid('venda');
      setStatus('Filtro aplicado: movimentos de venda');
      return;
    }

    if (cardKey === 'baixo') {
      setView('historico');
      setStatus('Abrindo histórico para analisar pagamentos por venda');
      return;
    }

    setSearchGrid('fechamento');
    if (token) void loadCaixaData(token, true, caixaHistoricoFilters);
    setStatus('Venda líquida atualizada e filtro de fechamento aplicado');
  }
  const caixaOperadoresDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    usuarios.forEach((item) => {
      if (item.id && item.nome) map.set(item.id, item.nome);
    });
    cashEntries.forEach((item) => {
      if (item.operadorId && item.operadorNome) map.set(item.operadorId, item.operadorNome);
    });
    if (user?.id) map.set(user.id, user.nome || 'Operador');
    return [...map.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [usuarios, cashEntries, user]);
  const caixaHistoricoFilters = useMemo<CaixaHistoricoFilters>(() => ({
    operadorId: isAdmin && caixaReportOperadorId !== 'todos' ? caixaReportOperadorId : undefined,
    dataInicio: toIsoDateTime(caixaReportFrom),
    dataFim: toIsoDateTime(caixaReportTo),
  }), [isAdmin, caixaReportOperadorId, caixaReportFrom, caixaReportTo]);
  const cashEntriesFiltrados = useMemo(() => {
    const term = searchGrid.trim().toLowerCase();
    const fromTime = caixaReportFrom ? new Date(caixaReportFrom).getTime() : null;
    const toTime = caixaReportTo ? new Date(caixaReportTo).getTime() : null;
    return cashEntries.filter((item) => {
      const date = new Date(item.data).toLocaleString('pt-BR').toLowerCase();
      const itemTime = new Date(item.data).getTime();
      const matchesFrom = fromTime === null || (Number.isFinite(itemTime) && itemTime >= fromTime);
      const matchesTo = toTime === null || (Number.isFinite(itemTime) && itemTime <= toTime);
      const matchesOperador = caixaReportOperadorId === 'todos' || item.operadorId === caixaReportOperadorId;
      const matchesSearch =
        !term ||
        item.tipo.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        date.includes(term) ||
        String(item.total).includes(term) ||
        (item.operadorNome ?? '').toLowerCase().includes(term);
      return matchesFrom && matchesTo && matchesOperador && matchesSearch;
    });
  }, [cashEntries, searchGrid, caixaReportFrom, caixaReportTo, caixaReportOperadorId]);
  const produtosFiltrados = useMemo(() => produtos.filter((i) => i.nome.toLowerCase().includes(searchGrid.toLowerCase())), [produtos, searchGrid]);
  const produtosDisponiveisVenda = useMemo(() => {
    const term = normalizeSearchText(searchVenda);
    if (!term) return [];

    const merged = new Map<string, Produto>();
    [...produtos, ...vendaSuggestions].forEach((item) => {
      merged.set(item.id, item);
    });

    const rank = (item: Produto): number => {
      const nome = normalizeSearchText(item.nome);
      const codigo = normalizeSearchText(item.codigo ?? '');
      const id = item.id.toLowerCase();

      if (codigo.startsWith(term)) return 0;
      if (nome.startsWith(term)) return 1;
      if (nome.split(' ').some((part) => part.startsWith(term))) return 2;
      if (nome.includes(term)) return 3;
      if (codigo.includes(term)) return 4;
      if (id.includes(term)) return 5;
      return 99;
    };

    return [...merged.values()]
      .map((item) => ({ item, score: rank(item) }))
      .filter((entry) => entry.score < 99)
      .sort((a, b) => a.score - b.score || a.item.nome.localeCompare(b.item.nome))
      .map((entry) => entry.item);
  }, [produtos, vendaSuggestions, searchVenda]);
  const vendaSuggestionItems = useMemo(() => produtosDisponiveisVenda.slice(0, 8), [produtosDisponiveisVenda]);
  const baixoEstoque = useMemo(() => produtosFiltrados.filter((i) => i.estoque <= 10), [produtosFiltrados]);
  const clientesFiltrados = useMemo(() => clientes.filter((i) => i.nome.toLowerCase().includes(searchGrid.toLowerCase())), [clientes, searchGrid]);
  const usuariosFiltrados = useMemo(() => usuarios.filter((i) => i.nome.toLowerCase().includes(searchGrid.toLowerCase())), [usuarios, searchGrid]);
  const fornecedoresFiltrados = useMemo(() => fornecedores.filter((i) => i.nome.toLowerCase().includes(searchGrid.toLowerCase())), [fornecedores, searchGrid]);
  const vendasView = useMemo<VendaView[]>(() => {
    const clientesNomes = clientes.map((item) => item.nome).filter(Boolean);
    const operadores = usuarios.map((item) => item.nome).filter(Boolean);
    const pagamentos = ['Dinheiro', 'Cartão', 'Transferência'];
    const statusList: Array<'Concluída' | 'Cancelada'> = ['Concluída', 'Concluída', 'Concluída', 'Cancelada'];
    return vendas.map((item) => {
      const hash = idHash(item.id);
      return {
        ...item,
        cliente: clientesNomes.length ? clientesNomes[hash % clientesNomes.length] : 'Cliente avulso',
        pagamento: pagamentos[hash % pagamentos.length],
        statusVenda: statusList[hash % statusList.length],
        operador: operadores.length ? operadores[hash % operadores.length] : (user?.nome || 'Operador'),
        itensTotal: item.itens.reduce((sum, it) => sum + it.quantidade, 0),
      };
    });
  }, [vendas, clientes, usuarios, user]);
  const historyFilteredSales = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;
    if (historyPeriod === 'hoje') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (historyPeriod === '7d') {
      from = new Date(now.getTime() - 6 * DAY_MS);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
    } else if (historyPeriod === '30d') {
      from = new Date(now.getTime() - 29 * DAY_MS);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
    } else if (historyPeriod === 'custom') {
      if (historyDateFrom) {
        from = new Date(historyDateFrom);
        from.setHours(0, 0, 0, 0);
      }
      if (historyDateTo) {
        to = new Date(historyDateTo);
        to.setHours(23, 59, 59, 999);
      }
    }

    const min = historyMinValue ? Number(historyMinValue.replace(',', '.')) : null;
    const max = historyMaxValue ? Number(historyMaxValue.replace(',', '.')) : null;
    const term = historySearch.trim().toLowerCase();

    return vendasView.filter((item) => {
      const date = new Date(item.createdAt);
      const total = toNum(item.total);
      if (from && date < from) return false;
      if (to && date > to) return false;
      if (min !== null && Number.isFinite(min) && total < min) return false;
      if (max !== null && Number.isFinite(max) && total > max) return false;
      if (historyCliente !== 'todos' && item.cliente !== historyCliente) return false;
      if (!term) return true;
      return (
        item.id.toLowerCase().includes(term) ||
        item.cliente.toLowerCase().includes(term) ||
        item.operador.toLowerCase().includes(term) ||
        item.pagamento.toLowerCase().includes(term) ||
        item.statusVenda.toLowerCase().includes(term)
      );
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [vendasView, historyPeriod, historyDateFrom, historyDateTo, historyMinValue, historyMaxValue, historyCliente, historySearch]);
  const historyChartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, idx) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - idx));
      day.setHours(0, 0, 0, 0);
      return day;
    });
    const values = days.map((day) => {
      const total = historyFilteredSales
        .filter((item) => sameDay(new Date(item.createdAt), day) && item.statusVenda === 'Concluída')
        .reduce((sum, item) => sum + toNum(item.total), 0);
      return { label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: total };
    });
    const max = Math.max(1, ...values.map((item) => item.value));
    return { values, max };
  }, [historyFilteredSales]);
  const historyConcludedSales = useMemo(
    () => historyFilteredSales.filter((item) => item.statusVenda === 'Concluída'),
    [historyFilteredSales]
  );
  const historyConcludedTotal = useMemo(
    () => historyConcludedSales.reduce((sum, item) => sum + toNum(item.total), 0),
    [historyConcludedSales]
  );
  const historyCardPixTotal = useMemo(
    () =>
      historyConcludedSales
        .filter((item) => {
          const pagamento = item.pagamento.toLowerCase();
          return pagamento.includes('cart') || pagamento.includes('pix') || pagamento.includes('transfer');
        })
        .reduce((sum, item) => sum + toNum(item.total), 0),
    [historyConcludedSales]
  );
  const historySpark = useMemo(() => {
    const base = historyChartData.values.map((item) => item.value);
    return base.some((value) => value > 0) ? base : [1, 2, 3, 4, 5, 6, 7];
  }, [historyChartData.values]);
  const historySalesVar = useMemo(() => {
    const prevValue = historySpark.length > 1 ? historySpark[historySpark.length - 2] : 0;
    const currentValue = historySpark.length > 0 ? historySpark[historySpark.length - 1] : 0;
    if (prevValue <= 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - prevValue) / prevValue) * 100;
  }, [historySpark]);
  const historySummaryCards = useMemo(
    () => [
      {
        key: 'vendas',
        title: 'Total do caixa',
        value: money(saldoCaixa),
        var: historySalesVar,
        icon: <FontAwesomeIcon icon={faMoneyBillWave} />,
        data: historySpark,
      },
      {
        key: 'produtos',
        title: 'Total de vendas',
        value: money(historyConcludedTotal),
        var: 0,
        icon: <FontAwesomeIcon icon={faFileInvoiceDollar} />,
        data: historySpark,
      },
      {
        key: 'baixo',
        title: 'Cartão ou Pix',
        value: money(historyCardPixTotal),
        var: 0,
        icon: <FontAwesomeIcon icon={faCartShopping} />,
        data: historySpark,
      },
      {
        key: 'usuarios',
        title: 'Venda líquida',
        value: money(historyConcludedTotal),
        var: 0,
        icon: <FontAwesomeIcon icon={faSackDollar} />,
        data: historySpark,
      },
    ],
    [historyCardPixTotal, historyConcludedTotal, historySalesVar, historySpark, saldoCaixa]
  );
  const historyTotalPages = Math.max(1, Math.ceil(historyFilteredSales.length / historyPageSize));
  const historyPageItems = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return historyFilteredSales.slice(start, start + historyPageSize);
  }, [historyFilteredSales, historyPage, historyPageSize]);
  const shiftHistoryCustomRange = (offsetDays: number): void => {
    const currentFrom = fromDateInput(historyDateFrom) ?? new Date(Date.now() - 7 * DAY_MS);
    const currentTo = fromDateInput(historyDateTo) ?? new Date();
    const nextFrom = new Date(currentFrom.getTime() + offsetDays * DAY_MS);
    const nextTo = new Date(currentTo.getTime() + offsetDays * DAY_MS);
    setHistoryPeriod('custom');
    setHistoryDateFrom(toDateInput(nextFrom));
    setHistoryDateTo(toDateInput(nextTo));
  };

  // Sessao: manipulacao de multiplos caixas ativos na venda.
  function updateActiveCart(updater: (prev: CartItem[]) => CartItem[]): void {
    setVendaCaixas((prev) =>
      prev.map((caixa, index) => (index === activeVendaCaixaIndex ? { ...caixa, itens: updater(caixa.itens) } : caixa))
    );
  }

  function clearActiveCart(): void {
    updateActiveCart(() => []);
  }

  function createVendaCaixa(): void {
    if (showPaymentModal) return;
    const nextIndex = vendaCaixas.length;
    setVendaCaixas((prev) => [...prev, { id: uid(), itens: [] }]);
    setActiveVendaCaixaIndex(nextIndex);
    setSearchVenda('');
    setVendaSuggestions([]);
    setActiveVendaSuggestionIndex(-1);
    setStatus(`Caixa ${nextIndex + 1} criado`);
    setError('');
  }

  function requestRemoveActiveVendaCaixa(): void {
    if (showPaymentModal) return;
    if (vendaCaixas.length <= 1) {
      setError('É necessário manter pelo menos 1 caixa');
      return;
    }
    setDeleteCaixaIndex(activeVendaCaixaIndex);
    setShowDeleteCaixaModal(true);
    setError('');
  }

  function confirmRemoveActiveVendaCaixa(): void {
    if (deleteCaixaIndex === null) {
      setShowDeleteCaixaModal(false);
      return;
    }
    const indexToRemove = deleteCaixaIndex;
    const caixaNumero = indexToRemove + 1;
    const nextLength = Math.max(1, vendaCaixas.length - 1);
    const nextIndex = indexToRemove >= nextLength ? Math.max(0, nextLength - 1) : indexToRemove;

    setVendaCaixas((prev) => prev.filter((_, index) => index !== indexToRemove));
    setActiveVendaCaixaIndex(nextIndex);
    setSearchVenda('');
    setVendaSuggestions([]);
    setActiveVendaSuggestionIndex(-1);
    setShowDeleteCaixaModal(false);
    setDeleteCaixaIndex(null);
    setStatus(`Caixa ${caixaNumero} excluído`);
    setError('');
  }

  function cancelRemoveActiveVendaCaixa(): void {
    setShowDeleteCaixaModal(false);
    setDeleteCaixaIndex(null);
  }

  function navigateVendaCaixa(direction: -1 | 1): void {
    if (showPaymentModal || vendaCaixas.length === 0) return;
    setActiveVendaCaixaIndex((current) => (current + direction + vendaCaixas.length) % vendaCaixas.length);
    setSearchVenda('');
    setVendaSuggestions([]);
    setActiveVendaSuggestionIndex(-1);
    setError('');
  }

  // Sessao: agregacoes de metricas e series do dashboard.
  const dashboardRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (dashboardPeriod === '7d') {
      const start = new Date(now.getTime() - 6 * DAY_MS);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (dashboardPeriod === '30d') {
      const start = new Date(now.getTime() - 29 * DAY_MS);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (dashboardPeriod === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end };
  }, [dashboardPeriod]);
  const dashboardPrevRange = useMemo(() => {
    const span = dashboardRange.end.getTime() - dashboardRange.start.getTime();
    const end = new Date(dashboardRange.start.getTime() - 1);
    const start = new Date(end.getTime() - span);
    return { start, end };
  }, [dashboardRange]);
  const dashboardVendasAtual = useMemo(
    () => vendas.filter((item) => {
      const d = new Date(item.createdAt);
      return d >= dashboardRange.start && d <= dashboardRange.end;
    }),
    [vendas, dashboardRange]
  );
  const dashboardVendasAnterior = useMemo(
    () => vendas.filter((item) => {
      const d = new Date(item.createdAt);
      return d >= dashboardPrevRange.start && d <= dashboardPrevRange.end;
    }),
    [vendas, dashboardPrevRange]
  );
  const dashboardMetrics = useMemo(() => {
    const vendasMes = dashboardVendasAtual.reduce((sum, item) => sum + toNum(item.total), 0);
    const vendasMesPrev = dashboardVendasAnterior.reduce((sum, item) => sum + toNum(item.total), 0);
    const totalProdutos = produtos.length;
    const totalProdutosPrev = Math.max(0, totalProdutos - 1);
    const baixo = baixoEstoque.length;
    const baixoPrev = Math.max(0, baixo + 1);
    const totalUsuarios = usuarios.length;
    const totalUsuariosPrev = Math.max(0, totalUsuarios - 1);
    const pct = (curr: number, prev: number): number => (prev <= 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
    return {
      vendasMes,
      totalProdutos,
      baixo,
      totalUsuarios,
      vendasVar: pct(vendasMes, vendasMesPrev),
      produtosVar: pct(totalProdutos, totalProdutosPrev),
      baixoVar: pct(baixo, baixoPrev),
      usuariosVar: pct(totalUsuarios, totalUsuariosPrev),
    };
  }, [dashboardVendasAtual, dashboardVendasAnterior, produtos.length, baixoEstoque.length, usuarios.length]);
  const dashboardSparklines = useMemo(() => {
    const base = historyChartData.values.map((item) => item.value);
    const normalized = base.length ? base : [0, 0, 0, 0, 0, 0, 0];
    const shifted = normalized.map((v, i) => Math.max(0, v + (i % 2 === 0 ? 200 : -130)));
    const estoqueLine = normalized.map((v, i) => Math.max(0, (baixoEstoque.length * 10) + (v / 1000) - i * 2));
    const usuarioLine = normalized.map((v, i) => Math.max(0, (usuarios.length * 9) + (v / 1200) + i));
    return { vendas: normalized, produtos: shifted, baixo: estoqueLine, usuarios: usuarioLine };
  }, [historyChartData, baixoEstoque.length, usuarios.length]);
  const dashboardMainChart = useMemo(() => {
    const pointsCount = dashboardPeriod === 'ano' ? 12 : dashboardPeriod === 'mes' ? Math.min(15, new Date().getDate()) : dashboardPeriod === '30d' ? 10 : 7;
    const labels = Array.from({ length: pointsCount }, (_, idx) => {
      if (dashboardPeriod === 'ano') return `M${idx + 1}`;
      const d = new Date();
      d.setDate(d.getDate() - (pointsCount - 1 - idx));
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    const receita = labels.map((_, idx) => {
      const ratio = (idx + 1) / labels.length;
      return dashboardMetrics.vendasMes * ratio * (0.6 + (Math.sin(idx) + 1) * 0.2);
    });
    const lucro = receita.map((item) => item * 0.28);
    const max = Math.max(1, ...receita);
    return { labels, receita, lucro, max };
  }, [dashboardMetrics.vendasMes, dashboardPeriod]);

  // Sessao: efeitos de ciclo de vida, persistencia e experiencia da interface.
  useEffect(() => {
    const remembered = localStorage.getItem('pdv_remember_me') === 'true';
    const savedEmail = localStorage.getItem('pdv_saved_email');
    if (savedEmail && remembered) setEmail(savedEmail);
    setRememberMe(remembered);
  
    setProdutos(loadJson<Produto[]>('pdv_produtos', []));
    setVendas(loadJson<Venda[]>('pdv_vendas', []));
    setClientes(loadJson<Cliente[]>('pdv_clientes', []));
    setUsuarios([]);
    setFornecedores([]);
    setCashEntries(loadJson<CashEntry[]>('pdv_cash_entries', []));
    setSaldoCaixa(loadJson<number>('pdv_cash_balance', 0));
    setCaixaAberto(loadJson<boolean>('pdv_cash_open', false));
    setPrinterName(loadJson<string>('pdv_printer_name', 'Impressora térmica 80mm'));
    setAutoPrint(loadJson<boolean>('pdv_auto_print', true));
    const localBackupFolder = loadLocalBackupFolder();
    setLocalBackupFolderName(localBackupFolder.folderName);
    if (localBackupFolder.backups.length > 0) {
      setLastBackupAt(localBackupFolder.backups[localBackupFolder.backups.length - 1].createdAt);
    }
    const accountSettings = loadAccountSettings();
    setAccountStartView(accountSettings.startView);
    setAccountHistoryPageSize(accountSettings.historyPageSize);
    setAccountConfirmLogout(accountSettings.confirmLogout);
    setAccountCollapsedMenu(accountSettings.collapsedMenu);
    setHistoryPageSize(accountSettings.historyPageSize);
    setMenuOpen(!accountSettings.collapsedMenu);
  }, []);

  useEffect(() => {
    let active = true;
    const syncStatus = async (silent: boolean): Promise<void> => {
      const latest = await loadLocalLicenseStatus(silent);
      if (!active) return;
      if (latest?.bloqueado) {
        setStatus('Licença local expirada. Renove para continuar usando o sistema.');
      }
      setLocalLicenseLoading(false);
    };

    void syncStatus(false);
    const intervalId = window.setInterval(() => {
      void syncStatus(true);
    }, 60_000);

    const onBlocked = (event: Event): void => {
      const detail = (event as CustomEvent<LocalLicenseStatus | null>).detail;
      if (detail) setLocalLicenseStatus(detail);
      setLocalLicenseLoading(false);
      setStatus('Licença local expirada. Renove para continuar usando o sistema.');
    };
    window.addEventListener(LOCAL_LICENSE_BLOCKED_EVENT, onBlocked as EventListener);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener(LOCAL_LICENSE_BLOCKED_EVENT, onBlocked as EventListener);
    };
  }, []);

  useEffect(() => saveJson('pdv_produtos', produtos), [produtos]);
  useEffect(() => saveJson('pdv_vendas', vendas), [vendas]);
  useEffect(() => saveJson('pdv_cash_entries', cashEntries), [cashEntries]);
  useEffect(() => saveJson('pdv_cash_balance', saldoCaixa), [saldoCaixa]);
  useEffect(() => saveJson('pdv_cash_open', caixaAberto), [caixaAberto]);
  useEffect(() => saveJson('pdv_clientes', clientes), [clientes]);
  useEffect(() => saveJson('pdv_printer_name', printerName), [printerName]);
  useEffect(() => saveJson('pdv_auto_print', autoPrint), [autoPrint]);
  useEffect(() => {
    saveJson<AccountSettings>(ACCOUNT_SETTINGS_KEY, normalizeAccountSettings({
      startView: accountStartView,
      historyPageSize: accountHistoryPageSize,
      confirmLogout: accountConfirmLogout,
      collapsedMenu: accountCollapsedMenu,
    }));
  }, [accountStartView, accountHistoryPageSize, accountConfirmLogout, accountCollapsedMenu]);
  useEffect(() => {
    const onFullscreenChange = (): void => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  
  
  useEffect(() => {
    if (!user) return;
    const profileMetaMap = loadJson<Record<string, ProfileMetadata>>(PROFILE_META_KEY, {});
    const fromMeta = profileMetaMap[user.id];
    const fromUsuario = usuarios.find((item) => item.id === user.id);
    setProfileNome(user.nome || (user.role === 'ADMIN' ? 'Administrador' : 'Operador'));
    setProfileEmail(user.email || '');
    setProfileCelular(fromUsuario?.celular ?? fromMeta?.celular ?? '');
    setProfileDataNascimento(fromUsuario?.dataNascimento ?? fromMeta?.dataNascimento ?? '');
    setProfileDocumento(fromUsuario?.documento ?? fromMeta?.documento ?? '');
    setProfileTipoPessoa(fromUsuario?.tipoPessoa ?? fromMeta?.tipoPessoa ?? 'PF');
  }, [user, usuarios]);

  useEffect(() => {
    if (!user || isAdmin) return;
    if (accountStartView === 'dashboard') setAccountStartView('venda');
  }, [user, isAdmin, accountStartView]);

  useEffect(() => {
    if (!showUserMenu) return;
    const onDocMouseDown = (event: MouseEvent): void => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const onEsc = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (!token || !user) return;
    if (!allowedViewsForCurrentRole.includes(view)) {
      setView(isAdmin ? 'dashboard' : 'venda');
    }
  }, [allowedViewsForCurrentRole, isAdmin, token, user, view]);

  useEffect(() => {
    if (!token || !isAdmin || view !== 'licenca') return;
    if (usuarios.length > 0) return;
    void loadUsuarios(token);
  }, [token, isAdmin, usuarios.length, view]);

  useEffect(() => {
    if (produtoPricingMode !== 'margem' || produtoCustoUnidadeNumero <= 0) return;
    setProdutoPreco(`R$ ${moneyField(produtoPrecoSugeridoNumero)}`);
  }, [produtoPricingMode, produtoCustoUnidadeNumero, produtoPrecoSugeridoNumero]);
  useEffect(() => {
    setHistoryPage(1);
  }, [historyPeriod, historyDateFrom, historyDateTo, historyMinValue, historyMaxValue, historyCliente, historySearch, historyPageSize]);
  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);
  useEffect(() => {
    if (!showPaymentModal) return;
    setPaymentLines((prev) => {
      const current = prev[0] ?? { id: uid(), tipo: 'DINHEIRO' as PaymentType, valor: '0,00', valorRecebido: '0,00', parcelas: 1, confirmado: true };
      const valor = `R$ ${moneyField(totalFinalVenda)}`;
      const valorRecebido = current.tipo === 'DINHEIRO'
        ? Math.max(moneyInput(current.valorRecebido), totalFinalVenda)
        : moneyInput(current.valorRecebido);
      return [{
        ...current,
        valor,
        valorRecebido: `R$ ${moneyField(valorRecebido)}`,
        confirmado: current.tipo === 'PIX' ? true : current.confirmado,
      }];
    });
  }, [showPaymentModal, totalFinalVenda]);
  useEffect(() => {
    if (searchVenda.trim().length === 0 || vendaSuggestionItems.length === 0) {
      setActiveVendaSuggestionIndex(-1);
      return;
    }
    setActiveVendaSuggestionIndex((current) => (current >= vendaSuggestionItems.length ? 0 : current));
  }, [searchVenda, vendaSuggestionItems.length]);
  useEffect(() => {
    if (view !== 'venda') {
      setVendaSuggestions([]);
      return;
    }

    const term = searchVenda.trim();
    if (!token || term.length < 1) {
      setVendaSuggestions([]);
      setLoadingVendaSuggestions(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingVendaSuggestions(true);
        const query = new URLSearchParams({ page: '1', limit: '30', busca: term });
        const { res, json } = await requestApi<ProdutoListResponse>(`/produtos?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (!res.ok || !json.success) {
          setVendaSuggestions([]);
          return;
        }
        setVendaSuggestions(json.data.dados);
      } catch {
        if (!active) return;
        setVendaSuggestions([]);
      } finally {
        if (active) setLoadingVendaSuggestions(false);
      }
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [view, token, searchVenda]);

  // Sessao: leitura de dados do backend.
  async function loadLocalLicenseStatus(silent = false): Promise<LocalLicenseStatus | null> {
    try {
      const { res, json } = await requestApi<LocalLicenseStatus>('/local-license/status', { cache: 'no-store' });
      if (!res.ok || !json.success) {
        if (!silent) setError(json.message ?? 'Falha ao carregar status da licença local');
        return null;
      }
      setLocalLicenseStatus(json.data);
      return json.data;
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar status da licença local');
      }
      return null;
    }
  }

  async function renewLocalLicense(): Promise<void> {
    if (!localLicenseRenewPassword.trim()) {
      setError('Informe a senha para renovar a licença');
      return;
    }
    setLocalLicenseRenewLoading(true);
    setError('');
    try {
      const { res, json } = await requestApi<LocalLicenseStatus>('/local-license/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: localLicenseRenewPassword.trim() }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao renovar licença');
      setLocalLicenseStatus(json.data);
      setLocalLicenseRenewPassword('');
      setStatus(`Licença renovada até ${new Date(json.data.dataExpiracao).toLocaleString('pt-BR')}`);

      if (token) {
        const startTasks: Array<Promise<unknown>> = [loadProdutos(token, ''), loadVendas(token, true), loadCaixaData(token, true, caixaHistoricoFilters)];
        if (user?.role === 'ADMIN') {
          startTasks.push(loadUsuarios(token), loadFornecedores(token));
        }
        const [, , hasOpenCash] = await Promise.all(startTasks);
        if (!hasOpenCash) setShowOpenCashModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao renovar licença');
    } finally {
      setLocalLicenseRenewLoading(false);
    }
  }

  async function changeLocalLicensePassword(): Promise<void> {
    if (!token || !isAdmin) return;
    if (!localLicenseCurrentPassword.trim() || !localLicenseNewPassword.trim()) {
      setError('Informe a senha atual e a nova senha de renovação');
      return;
    }
    if (localLicenseNewPassword.trim().length < 4) {
      setError('A nova senha de renovação deve ter ao menos 4 caracteres');
      return;
    }
    setLocalLicensePasswordLoading(true);
    setError('');
    try {
      const { res, json } = await requestApi<unknown>('/local-license/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senhaAtual: localLicenseCurrentPassword.trim(),
          novaSenha: localLicenseNewPassword.trim(),
        }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao alterar senha de renovação');
      setLocalLicenseCurrentPassword('');
      setLocalLicenseNewPassword('');
      setStatus('Senha de renovação da licença atualizada com sucesso');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar senha de renovação');
    } finally {
      setLocalLicensePasswordLoading(false);
    }
  }

  async function createLicenseForUser(): Promise<void> {
    if (!token || !isAdmin) return;
    if (!licenseUserId) {
      setError('Selecione um usuário para gerar a licença');
      return;
    }
    const maxDevices = Math.max(1, Number(licenseMaxDevices) || 1);
    const validityDays = Math.max(1, Number(licenseValidityDays) || 40);

    setLicenseCreateLoading(true);
    setError('');
    try {
      const payload: {
        userId: string;
        planType: LicensePlanType;
        maxDevices: number;
        validityDays?: number;
      } = {
        userId: licenseUserId,
        planType: licensePlanType,
        maxDevices,
      };
      if (licensePlanType !== 'LIFETIME') {
        payload.validityDays = validityDays;
      }

      const { res, json } = await requestApi<CreatedUserLicense>('/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao gerar licença');
      setLastCreatedUserLicense(json.data);
      setStatus(`Licença gerada com sucesso: ${json.data.licenseKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar licença');
    } finally {
      setLicenseCreateLoading(false);
    }
  }

  async function loadProdutos(authToken: string, busca: string): Promise<void> {
    try {
      const query = new URLSearchParams({ page: '1', limit: '100' });
      if (busca.trim()) query.set('busca', busca.trim());
      const { res, json } = await requestApi<ProdutoListResponse>(`/produtos?${query.toString()}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Falha ao carregar produtos do banco');
        return;
      }
      setProdutos(json.data.dados);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar produtos do banco');
    }
  }

  async function loadVendas(authToken: string, forceRefresh = false): Promise<void> {
    const query = new URLSearchParams({ page: '1', limit: '100' });
    if (forceRefresh) query.set('_', String(Date.now()));
    const { res, json } = await requestApi<VendaListResponse>(`/vendas?${query.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    });
    if (res.ok && json.success) setVendas(json.data.dados);
  }

  async function loadCaixaData(authToken: string, forceRefresh = false, filters?: CaixaHistoricoFilters): Promise<boolean> {
    const historicoQuery = new URLSearchParams({ page: '1', limit: '100' });
    if (filters?.operadorId) historicoQuery.set('operadorId', filters.operadorId);
    if (filters?.dataInicio) historicoQuery.set('dataInicio', filters.dataInicio);
    if (filters?.dataFim) historicoQuery.set('dataFim', filters.dataFim);
    if (forceRefresh) historicoQuery.set('_', String(Date.now()));
    const suffix = forceRefresh ? `&_=${Date.now()}` : '';
    const [ativoPayload, historicoPayload] = await Promise.all([
      requestApi<{ caixa: { valorInicial: number | string }; indicadores: { totalDinheiro: number; totalSuprimento: number; totalSangria: number } } | null>(`/caixas/ativo?limit=1${suffix}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      }),
      requestApi<{
        dados: Array<{
          id: string;
          tipo: CashEntry['tipo'];
          descricao: string | null;
          valor: number | string;
          criadoEm: string;
          operadorId?: string;
          operador?: { id: string; nome: string } | null;
        }>;
        total: number;
      }>(`/caixas/historico?${historicoQuery.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      }),
    ]);
    const ativoRes = ativoPayload.res;
    const ativoJson = ativoPayload.json;
    const historicoRes = historicoPayload.res;
    const historicoJson = historicoPayload.json;

    if (ativoRes.ok && ativoJson.success && ativoJson.data) {
      const saldo =
        toNum(ativoJson.data.caixa.valorInicial) +
        toNum(ativoJson.data.indicadores.totalDinheiro) +
        toNum(ativoJson.data.indicadores.totalSuprimento) -
        toNum(ativoJson.data.indicadores.totalSangria);
      setCaixaAberto(true);
      setSaldoCaixa(saldo);
      if (historicoRes.ok && historicoJson.success) {
        setCashEntries(
          historicoJson.data.dados.map((item) => ({
            id: item.id,
            tipo: item.tipo,
            descricao: item.descricao ?? item.tipo,
            total: toNum(item.valor),
            data: item.criadoEm,
            operadorId: item.operadorId,
            operadorNome: item.operador?.nome ?? 'Operador',
          }))
        );
      }
      return true;
    } else {
      setCaixaAberto(false);
      setSaldoCaixa(0);
    }

    if (historicoRes.ok && historicoJson.success) {
      setCashEntries(
        historicoJson.data.dados.map((item) => ({
          id: item.id,
          tipo: item.tipo,
          descricao: item.descricao ?? item.tipo,
          total: toNum(item.valor),
          data: item.criadoEm,
          operadorId: item.operadorId,
          operadorNome: item.operador?.nome ?? 'Operador',
        }))
      );
    }
    return false;
  }

  async function loadUsuarios(authToken: string): Promise<void> {
    try {
      const query = new URLSearchParams({ page: '1', limit: '100' });
      const { res, json } = await requestApi<UsuarioListResponse>(`/usuarios?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Falha ao carregar usuários');
      }
      setUsuarios(
        json.data.dados.map((item) => ({
          id: item.id,
          nome: item.nome,
          email: item.email,
          celular: '',
          permissao: roleToPermissao(item.role),
          dataNascimento: '',
          documento: '',
          tipoPessoa: 'PF',
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários');
    }
  }

  async function loadFornecedores(authToken: string): Promise<void> {
    try {
      const query = new URLSearchParams({ page: '1', limit: '100' });
      const { res, json } = await requestApi<FornecedorListResponse>(`/fornecedores?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Falha ao carregar fornecedores');
      }
      setFornecedores(
        json.data.dados.map((item) => ({
          id: item.id,
          nome: item.nome,
          email: item.email ?? '',
          celular: item.telefone ?? '',
          createdAt: item.createdAt,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar fornecedores');
    }
  }

  // Sessao: autenticacao e recuperacao de acesso.
  async function login(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);
    try {
      const { res, json } = await requestApi<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha no login');

      if (rememberMe) {
        localStorage.setItem('pdv_remember_me', 'true');
        localStorage.setItem('pdv_saved_email', email);
      } else {
        localStorage.removeItem('pdv_remember_me');
        localStorage.removeItem('pdv_saved_email');
      }

      const accountSettings = loadAccountSettings();
      setAccountStartView(accountSettings.startView);
      setAccountHistoryPageSize(accountSettings.historyPageSize);
      setAccountConfirmLogout(accountSettings.confirmLogout);
      setAccountCollapsedMenu(accountSettings.collapsedMenu);
      setToken(json.data.token);
      setUser(json.data.user);
      setView(resolveAccountStartView(json.data.user.role, accountSettings.startView));
      setHistoryPageSize(accountSettings.historyPageSize);
      setMenuOpen(!accountSettings.collapsedMenu);
      const licenseStatus = await loadLocalLicenseStatus();
      if (licenseStatus?.bloqueado) return;
      if (json.data.user.role !== 'ADMIN') {
        setUsuarios([]);
        setFornecedores([]);
      }
      const startTasks: Array<Promise<unknown>> = [loadProdutos(json.data.token, ''), loadVendas(json.data.token), loadCaixaData(json.data.token, false, caixaHistoricoFilters)];
      if (json.data.user.role === 'ADMIN') {
        startTasks.push(loadUsuarios(json.data.token), loadFornecedores(json.data.token));
      }
      const [, , hasOpenCash] = await Promise.all(startTasks);
      if (!hasOpenCash) setShowOpenCashModal(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'E-mail ou senha inválidos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(): Promise<void> {
    if (!email.trim()) {
      setError('Informe seu e-mail para recuperar a senha');
      return;
    }
    setRecoveryLoading(true);
    setError('');
    try {
      const { res } = await requestApi<unknown>('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao solicitar recuperação');
      setStatus('Se o e-mail existir, você receberá as instruções de recuperação');
    } catch (err) {
      setStatus('Se o e-mail existir, você receberá as instruções de recuperação');
    } finally {
      setRecoveryLoading(false);
    }
  }

  // Sessao: manutencao de cadastro de produtos.
  function calcularMargemPct(precoVenda: number, custoUnitario: number): number {
    if (custoUnitario <= 0) return 0;
    return Math.max(0, ((precoVenda - custoUnitario) / custoUnitario) * 100);
  }

  function handleProdutoPrecoChange(value: string): void {
    const formatted = formatCurrencyInput(value);
    const precoVenda = moneyInput(formatted);
    setProdutoPricingMode('preco');
    setProdutoPreco(formatted);
    setProdutoMargemManual(moneyField(calcularMargemPct(precoVenda, produtoCustoUnidadeNumero)));
  }

  function handleProdutoMargemManualChange(value: string): void {
    setProdutoPricingMode('margem');
    setProdutoMargemManual(formatPercentInput(value));
  }

  function resetProdutoFormFields(): void {
    setProdutoNome('');
    setProdutoCodigo('');
    setProdutoPreco('R$ 0,00');
    setProdutoPrecoFardo('0,00');
    setProdutoQtdFardo('5');
    setProdutoMargemManual('50,00');
    setProdutoPricingMode('margem');
    setProdutoEstoque('0');
    setProdutoEstoqueMinimo('1');
    setProdutoValidade('');
    setProdutoCategoria('Nenhum');
    setProdutoDescricao('');
    setProdutoMarca('Nenhum');
    setProdutoLote('');
    setProdutoFornecedor('');
    setProdutoFormTab('geral');
    setEditingProdutoId(null);
  }

  function openNovoProdutoModal(): void {
    resetProdutoFormFields();
    setShowProdutoModal(true);
  }

  function confirmarNovaCategoria(): void {
    const nome = novaCategoria.trim();
    if (!nome) return;
    setProdutoCategorias((prev) => (prev.some((item) => item.toLowerCase() === nome.toLowerCase()) ? prev : [...prev, nome]));
    setProdutoCategoria(nome);
    setNovaCategoria('');
    setShowAddCategoriaModal(false);
  }

  function confirmarNovaMarca(): void {
    const nome = novaMarca.trim();
    if (!nome) return;
    setProdutoMarcas((prev) => (prev.some((item) => item.toLowerCase() === nome.toLowerCase()) ? prev : [...prev, nome]));
    setProdutoMarca(nome);
    setNovaMarca('');
    setShowAddMarcaModal(false);
  }

  function abrirImpressaoProduto(produto: Produto): void {
    setProdutoToPrint(produto);
    setShowPrintProdutoModal(true);
  }

  function confirmarImpressaoProduto(): void {
    if (!produtoToPrint) return;
    setStatus(`Etiqueta de preço de ${produtoToPrint.nome} enviada para impressão`);
    setShowPrintProdutoModal(false);
    setProdutoToPrint(null);
  }

  async function adicionarProdutoApi(): Promise<void> {
    if (!token) return;
    const preco = moneyInput(produtoPreco);
    const estoque = Number(produtoEstoque) || 0;
    if (!produtoNome.trim() || preco <= 0) return;

    const { res, json } = await requestApi<Produto>('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: produtoNome.trim(), codigo: produtoCodigo.trim() || null, preco, estoque, categoriaId: null }),
    });
    if (!res.ok || !json.success) {
      setError(json.message ?? 'Erro ao criar produto');
      return;
    }

    setShowProdutoModal(false);
    resetProdutoFormFields();
    setStatus('Produto adicionado');
    await loadProdutos(token, '');
  }

  async function removerProdutoApi(id: string): Promise<void> {
    if (!token) return;
    const endpoint = `/produtos/${id}`;
    const init: RequestInit = { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } };
    let res = await fetch(`${apiBase}${endpoint}`, init);
    if (!res.ok && apiBase !== apiFallbackBase) {
      res = await fetch(`${apiFallbackBase}${endpoint}`, init);
    }

    if (res.ok) {
      setProdutos((prev) => prev.filter((item) => item.id !== id));
      setStatus('Produto removido com sucesso');
      setError('');
      await loadProdutos(token, '');
      return;
    }

    let message = 'Erro ao remover produto';
    try {
      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text) as ApiResponse<unknown>;
        message = parsed.message ?? message;
      }
    } catch {
      // Mantém mensagem padrão quando a API não retorna JSON.
    }
    setError(message);
  }

  function abrirEdicaoProduto(produto: Produto): void {
    const precoVenda = toNum(produto.preco);
    const custoUnitario = precoVenda;
    setEditingProdutoId(produto.id);
    setProdutoNome(produto.nome);
    setProdutoCodigo(produto.codigo ?? '');
    setProdutoPreco(`R$ ${precoVenda.toFixed(2).replace('.', ',')}`);
    setProdutoPrecoFardo((precoVenda * 5).toFixed(2).replace('.', ','));
    setProdutoQtdFardo('5');
    setProdutoMargemManual(moneyField(calcularMargemPct(precoVenda, custoUnitario)));
    setProdutoPricingMode('preco');
    setProdutoEstoque(String(produto.estoque));
    setProdutoEstoqueMinimo('1');
    setProdutoFormTab('geral');
    setShowEditProdutoModal(true);
    setError('');
  }

  async function atualizarProdutoApi(): Promise<void> {
    if (!token || !editingProdutoId) return;
    const preco = moneyInput(produtoPreco);
    const estoque = Number(produtoEstoque) || 0;
    if (!produtoNome.trim() || preco <= 0) {
      setError('Preencha nome e preço válido');
      return;
    }

    const { res, json } = await requestApi<Produto>(`/produtos/${editingProdutoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: produtoNome.trim(), codigo: produtoCodigo.trim() || null, preco, estoque }),
    });
    if (!res.ok || !json.success) {
      setError(json.message ?? 'Erro ao atualizar produto');
      return;
    }

    setShowEditProdutoModal(false);
    resetProdutoFormFields();
    setStatus('Produto atualizado');
    await loadProdutos(token, '');
  }

  // Sessao: fluxo do carrinho e selecao de itens para venda.
  function addToCart(produto: Produto): boolean {
    if (showPaymentModal) return false;
    if (!caixaAberto) {
      setShowOpenCashModal(true);
      setError('Abra o caixa para vender');
      return false;
    }
    if (produto.estoque <= 0) {
      setError(`"${produto.nome}" está sem estoque. Não é possível adicionar ao carrinho.`);
      return false;
    }
    const found = cart.find((item) => item.produto.id === produto.id);
    if (found && found.quantidade >= produto.estoque) {
      setError(`Estoque insuficiente para adicionar mais unidades de "${produto.nome}".`);
      return false;
    }
    updateActiveCart((prev) => {
      const current = prev.find((item) => item.produto.id === produto.id);
      if (!current) return [...prev, { produto, quantidade: 1 }];
      return prev.map((item) => (item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item));
    });
    setError('');
    return true;
  }

  function selecionarSugestaoVenda(produto: Produto): void {
    const added = addToCart(produto);
    if (!added) return;
    setSearchVenda('');
    setVendaSuggestions([]);
    setActiveVendaSuggestionIndex(-1);
  }

  function removeFromCart(produtoId: string): void {
    if (showPaymentModal) return;
    updateActiveCart((prev) => prev.filter((item) => item.produto.id !== produtoId));
  }

  function updateQuantity(produtoId: string, quantidade: number): void {
    if (showPaymentModal) return;
    if (quantidade <= 0) {
      removeFromCart(produtoId);
      return;
    }
    updateActiveCart((prev) => prev.map((item) => (item.produto.id === produtoId ? { ...item, quantidade } : item)));
  }

  function abrirModalPagamento(): void {
    if (!caixaAberto) {
      setError('Abra o caixa para vender');
      setShowOpenCashModal(true);
      return;
    }
    if (cart.length === 0) {
      setError('Adicione itens para finalizar a venda');
      return;
    }
    setSaleDiscount('0,00');
    setSaleCpf('');
    setSaleCliente('');
    setSalePaymentDate(toDateInput(new Date()));
    setSaleObs('');
    setPaymentLines([{ id: uid(), tipo: 'DINHEIRO', valor: totalCarrinho.toFixed(2).replace('.', ','), valorRecebido: totalCarrinho.toFixed(2).replace('.', ','), parcelas: 1, confirmado: true }]);
    setShowPaymentModal(true);
    setError('');
  }

  function updateMainPaymentLine(patch: Partial<PaymentLine>): void {
    setPaymentLines((prev) => {
      const current = prev[0] ?? { id: uid(), tipo: 'DINHEIRO' as PaymentType, valor: '0,00', valorRecebido: '0,00', parcelas: 1, confirmado: true };
      return [{ ...current, ...patch }];
    });
  }

  async function confirmarPagamentoVenda(): Promise<void> {
    if (!token || !caixaAberto || cart.length === 0) return;
    if (descontoVenda > subtotalVenda) {
      setError('Desconto não pode ser maior que o subtotal');
      return;
    }
    if (Math.abs(totalPagamentosInformados - totalFinalVenda) >= 0.01) {
      setError('A soma dos pagamentos deve ser igual ao total final');
      return;
    }

    for (const line of paymentLines) {
      const valor = moneyInput(line.valor);
      if (line.tipo === 'DINHEIRO') {
        const recebido = moneyInput(line.valorRecebido);
        if (recebido < valor) {
          setError('Valor recebido em dinheiro deve ser maior ou igual ao valor informado');
          return;
        }
      }
      if (line.tipo === 'PIX' && !line.confirmado) {
        setError('Confirme o recebimento PIX antes de concluir');
        return;
      }
      if (line.tipo === 'CARTAO_CREDITO' && (line.parcelas < 1 || line.parcelas > 12)) {
        setError('Parcelas do cartão devem estar entre 1 e 12');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const { res, json } = await requestApi<{ id: string; total: number | string }>('/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          itens: cart.map((item) => ({ produtoId: item.produto.id, quantidade: item.quantidade, precoUnit: toNum(item.produto.preco) })),
          desconto: descontoVenda,
          cpf: saleCpf.trim() || undefined,
          cliente: saleCliente.trim() || undefined,
          observacao: saleObs.trim() || undefined,
          pagamentos: paymentLines.map((line) => ({
            tipo: line.tipo,
            valor: moneyInput(line.valor),
            valorRecebido: line.tipo === 'DINHEIRO' ? moneyInput(line.valorRecebido) : undefined,
            parcelas: line.tipo === 'CARTAO_CREDITO' ? line.parcelas : undefined,
            confirmado: line.tipo === 'PIX' ? line.confirmado : undefined,
          })),
        }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erro ao finalizar venda');

      const itensComprovante = cart.map((item) => ({
        nome: item.produto.nome,
        codigo: item.produto.codigo ?? null,
        quantidade: item.quantidade,
        precoUnit: toNum(item.produto.preco),
        subtotal: toNum(item.produto.preco) * item.quantidade,
      }));
      const pagamentosComprovante = paymentLines.map((line) => ({
        tipo: line.tipo,
        valor: moneyInput(line.valor),
        valorRecebido: line.tipo === 'DINHEIRO' ? moneyInput(line.valorRecebido) : undefined,
        parcelas: line.tipo === 'CARTAO_CREDITO' ? line.parcelas : undefined,
      }));
      const trocoComprovante = paymentLines
        .filter((line) => line.tipo === 'DINHEIRO')
        .reduce((sum, line) => sum + Math.max(0, moneyInput(line.valorRecebido) - moneyInput(line.valor)), 0);

      const total = toNum(json.data.total);
      imprimirComprovanteVenda({
        vendaId: json.data.id,
        dataPagamento: salePaymentDate || toDateInput(new Date()),
        operador: user?.nome || 'Operador',
        cliente: saleCliente.trim() || 'Cliente avulso',
        cpf: saleCpf.trim() || undefined,
        itens: itensComprovante,
        pagamentos: pagamentosComprovante,
        subtotal: subtotalVenda,
        desconto: descontoVenda,
        total,
        troco: trocoComprovante,
      });
      clearActiveCart();
      setShowPaymentModal(false);
      setStatus(`Venda finalizada: ${money(total)}`);
      await Promise.all([loadProdutos(token, ''), loadVendas(token), loadCaixaData(token, false, caixaHistoricoFilters)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  }

  async function aplicarFiltrosRelatorioCaixa(): Promise<void> {
    if (!token) return;
    setError('');
    const from = caixaReportFrom ? new Date(caixaReportFrom) : null;
    const to = caixaReportTo ? new Date(caixaReportTo) : null;
    if (from && to && from.getTime() > to.getTime()) {
      setError('Período inválido: o horário inicial deve ser menor ou igual ao final');
      return;
    }
    await loadCaixaData(token, true, caixaHistoricoFilters);
    setStatus('Filtro de relatório aplicado no caixa');
  }

  function limparFiltrosRelatorioCaixa(): void {
    setCaixaReportFrom('');
    setCaixaReportTo('');
    setCaixaReportOperadorId('todos');
    if (token) {
      void loadCaixaData(token, true, {});
    }
    setStatus('Filtros do relatório limpos');
    setError('');
  }

  // Sessao: operacoes de caixa (abertura, fechamento e movimentacoes).
  async function abrirCaixa(): Promise<void> {
    if (!token || openingCashLoading) return;
    setError('');
    setStatus('');
    const valorInicial = openCashSemValor ? 0 : moneyInput(openCashValor);
    const descricao = openCashDescricao.trim();
    if (descricao.length < 3) {
      setError('Informe uma descrição válida para abertura');
      return;
    }
    if (!openCashSemValor && valorInicial <= 0) {
      setError('Valor inicial deve ser maior que zero');
      return;
    }
    setOpeningCashLoading(true);
    try {
      const { res, json } = await requestApi<unknown>('/caixas/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valorInicial, descricao }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erro ao abrir caixa');
      setShowOpenCashModal(false);
      setOpenCashSemValor(false);
      setOpenCashValor('0,00');
      setStatus('Caixa aberto com sucesso');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir caixa');
    } finally {
      try {
        await loadCaixaData(token, false, caixaHistoricoFilters);
      } catch {
        // Mantém o estado atual caso a atualização do caixa falhe.
      }
      setOpeningCashLoading(false);
    }
  }

  async function fecharCaixa(): Promise<void> {
    if (!token || !caixaAberto) return;
    try {
      const { res, json } = await requestApi<unknown>('/caixas/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valorContadoDinheiro: saldoCaixa, justificativa: 'Fechamento operacional' }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Erro ao fechar caixa');
      setStatus('Caixa fechado');
      await loadCaixaData(token, false, caixaHistoricoFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fechar caixa');
    }
  }

  async function confirmarFluxo(tipo: 'SUPRIMENTO' | 'SANGRIA'): Promise<void> {
    if (!token || !caixaAberto) return;
    const valor = moneyInput(flowValor);
    if (valor <= 0) return;
    try {
      const endpoint = tipo === 'SUPRIMENTO' ? 'suprimento' : 'sangria';
      const { res, json } = await requestApi<unknown>(`/caixas/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor, motivo: flowDescricao.trim() || tipo, confirmacao: true }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? `Erro ao registrar ${tipo.toLowerCase()}`);
      setShowFlowModal(null);
      setFlowDescricao('');
      setFlowValor('0,00');
      await loadCaixaData(token, false, caixaHistoricoFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao registrar ${tipo.toLowerCase()}`);
    }
  }

  // Sessao: CRUD de clientes (local) e cadastro de usuarios/fornecedores (API).
  function addCliente(): void {
    // Cliente ainda e salvo localmente para nao quebrar fluxo enquanto o modulo backend de clientes nao existe.
    if (!clienteNome.trim()) return;
    setClientes((prev) => [...prev, { id: uid(), nome: clienteNome.trim(), celular: clienteCelular.trim(), limiteTotal: moneyInput(clienteLimite), creditoUso: 0, status: 'Ativo' }]);
    setShowClienteModal(false);
    setClienteNome('');
    setClienteCelular('');
    setClienteLimite('0,00');
  }

  function resetUsuarioForm(): void {
    setUsuarioNome('');
    setUsuarioEmail('');
    setUsuarioCelular('');
    setUsuarioPermissao('Nenhum');
    setUsuarioDataNascimento('');
    setUsuarioDocumento('');
    setUsuarioTipoPessoa('PF');
    setUsuarioSenha('');
    setUsuarioSenhaConfirm('');
    setEditingUsuarioId(null);
  }

  function openNovoUsuarioForm(): void {
    resetUsuarioForm();
    setShowUsuarioForm(true);
  }

  async function openEditarUsuarioForm(usuario: Usuario): Promise<void> {
    setEditingUsuarioId(usuario.id);
    setUsuarioNome(usuario.nome);
    setUsuarioEmail(usuario.email);
    setUsuarioCelular(usuario.celular);
    setUsuarioPermissao(usuario.permissao);
    setUsuarioDataNascimento(usuario.dataNascimento ?? '');
    setUsuarioDocumento(usuario.documento ?? '');
    setUsuarioTipoPessoa(usuario.tipoPessoa ?? 'PF');
    setUsuarioSenha('');
    setUsuarioSenhaConfirm('');
    setShowUsuarioForm(true);
  }

  function closeUsuarioForm(): void {
    setShowUsuarioForm(false);
    resetUsuarioForm();
  }

  async function saveUsuarioForm(): Promise<void> {
    if (!token || !isAdmin) {
      setError('Apenas administrador pode salvar usuários');
      return;
    }
    if (!usuarioNome.trim() || !usuarioEmail.trim()) {
      setError('Preencha nome e e-mail do usuário');
      return;
    }
    if (!editingUsuarioId && (!usuarioSenha.trim() || !usuarioSenhaConfirm.trim())) {
      setError('Informe senha e repetição de senha');
      return;
    }
    if (usuarioSenha || usuarioSenhaConfirm) {
      if (usuarioSenha !== usuarioSenhaConfirm) {
        setError('As senhas não conferem');
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        nome: usuarioNome.trim(),
        email: usuarioEmail.trim(),
        role: permissaoToRole(usuarioPermissao),
        ...(usuarioSenha.trim() ? { senha: usuarioSenha.trim() } : {}),
      };
      const path = editingUsuarioId ? `/usuarios/${editingUsuarioId}` : '/usuarios';
      const method = editingUsuarioId ? 'PATCH' : 'POST';
      const { res, json } = await requestApi<UsuarioApi>(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao salvar usuário');

      await loadUsuarios(token);
      if (editingUsuarioId) {
        setStatus('Usuário atualizado com sucesso');
      } else {
        setStatus('Usuário adicionado com sucesso');
      }
      closeUsuarioForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar usuário');
    } finally {
      setLoading(false);
    }
  }

  function removeUsuario(id: string): void {
    if (!token || !isAdmin) {
      setError('Apenas administrador pode excluir usuários');
      return;
    }
    const target = usuarios.find((item) => item.id === id);
    setPendingAdminDelete({
      kind: 'usuario',
      id,
      label: target?.nome || 'este usuário',
    });
    setShowAdminDeleteModal(true);
  }

  function resetFornecedorForm(): void {
    setFornecedorNome('');
    setFornecedorEmail('');
    setFornecedorCelular('');
    setEditingFornecedorId(null);
  }

  function openNovoFornecedorForm(): void {
    resetFornecedorForm();
    setShowFornecedorForm(true);
  }

  function openEditarFornecedorForm(fornecedor: Fornecedor): void {
    setEditingFornecedorId(fornecedor.id);
    setFornecedorNome(fornecedor.nome);
    setFornecedorEmail(fornecedor.email);
    setFornecedorCelular(fornecedor.celular);
    setShowFornecedorForm(true);
  }

  function closeFornecedorForm(): void {
    setShowFornecedorForm(false);
    resetFornecedorForm();
  }

  async function saveFornecedorForm(): Promise<void> {
    if (!token || !isAdmin) {
      setError('Apenas administrador pode salvar fornecedores');
      return;
    }
    if (!fornecedorNome.trim()) {
      setError('Preencha o nome do fornecedor');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        nome: fornecedorNome.trim(),
        email: fornecedorEmail.trim() || null,
        telefone: fornecedorCelular.trim() || null,
      };
      const path = editingFornecedorId ? `/fornecedores/${editingFornecedorId}` : '/fornecedores';
      const method = editingFornecedorId ? 'PATCH' : 'POST';
      const { res, json } = await requestApi<FornecedorApi>(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao salvar fornecedor');

      await loadFornecedores(token);
      setStatus(editingFornecedorId ? 'Fornecedor atualizado com sucesso' : 'Fornecedor adicionado com sucesso');
      closeFornecedorForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar fornecedor');
    } finally {
      setLoading(false);
    }
  }

  function removeFornecedor(id: string): void {
    if (!token || !isAdmin) {
      setError('Apenas administrador pode excluir fornecedores');
      return;
    }
    const target = fornecedores.find((item) => item.id === id);
    setPendingAdminDelete({
      kind: 'fornecedor',
      id,
      label: target?.nome || 'este fornecedor',
    });
    setShowAdminDeleteModal(true);
  }

  function closeAdminDeleteModal(): void {
    setShowAdminDeleteModal(false);
    setPendingAdminDelete(null);
  }

  async function confirmAdminDelete(): Promise<void> {
    if (!token || !isAdmin || !pendingAdminDelete) {
      closeAdminDeleteModal();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const endpoint = pendingAdminDelete.kind === 'usuario'
        ? `/usuarios/${pendingAdminDelete.id}`
        : `/fornecedores/${pendingAdminDelete.id}`;

      const { res, json } = await requestApi<unknown>(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(json.message ?? 'Falha ao excluir registro');

      if (pendingAdminDelete.kind === 'usuario') {
        await loadUsuarios(token);
        setStatus('Usuário excluído com sucesso');
      } else {
        await loadFornecedores(token);
        setStatus('Fornecedor excluído com sucesso');
      }
      closeAdminDeleteModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir registro');
    } finally {
      setLoading(false);
    }
  }

  // Sessao: utilitarios de navegacao e ferramentas de interface.
  function titleForView(v: ViewKey): string {
    return {
      dashboard: 'Dashboard',
      venda: 'Realizar venda',
      caixa: 'Gerenciar caixa',
      clientes: 'Clientes',
      produtos: 'Todos os produtos',
      'baixo-estoque': 'Produtos com baixo estoque',
      usuarios: 'Usuários',
      fornecedores: 'Fornecedores',
      historico: 'Histórico de Vendas',
      impressoras: 'Impressoras',
      backup: 'Backup',
      licenca: 'Licença local',
      perfil: 'Meu perfil',
    }[v];
  }

  function resolveAccountStartView(role: string, preferredView: AccountStartView = accountStartView): ViewKey {
    if (role !== 'ADMIN' && preferredView === 'dashboard') return 'venda';
    const roleAllowed: ViewKey[] =
      role === 'ADMIN'
        ? ['dashboard', 'venda', 'caixa', 'clientes', 'produtos', 'baixo-estoque', 'usuarios', 'fornecedores', 'historico', 'impressoras', 'backup', 'licenca', 'perfil']
        : role === 'CAIXA'
          ? ['dashboard', 'venda', 'caixa', 'produtos', 'baixo-estoque', 'historico', 'perfil']
          : ['dashboard', 'venda', 'caixa', 'historico', 'perfil'];
    return roleAllowed.includes(preferredView) ? preferredView : (role === 'ADMIN' ? 'dashboard' : 'venda');
  }

  function renderLocalLicenseRenewContent(mode: 'login' | 'blocked') {
    return (
      <div className={`local-license-card ${mode === 'blocked' ? 'blocked' : 'login'}`}>
        <h3>Licença local {localLicenseBlocked ? 'expirada' : 'em validação'}</h3>
        <p>
          {localLicenseLoading
            ? 'Verificando status da licença...'
            : localLicenseBlocked
              ? `A licença expirou em ${localLicenseExpirationLabel}.`
              : `Licença ativa com ${localLicenseStatus?.diasRestantes ?? 0} dia(s) restante(s).`}
        </p>
        <p className="local-license-tip">Validade padrão: 40 dias. Senha inicial: RENOVA2024 (altere após a instalação).</p>
        <div className="local-license-grid">
          <label>Senha de renovação</label>
          <input
            type="password"
            value={localLicenseRenewPassword}
            onChange={(event) => setLocalLicenseRenewPassword(event.target.value)}
            placeholder="Digite a senha de renovação"
          />
          <button type="button" onClick={() => void renewLocalLicense()} disabled={localLicenseRenewLoading || localLicenseLoading}>
            {localLicenseRenewLoading ? 'Renovando...' : 'Renovar licença'}
          </button>
        </div>
        {isAdmin && token && (
          <div className="local-license-grid local-license-password-grid">
            <label>Senha atual da renovação</label>
            <input
              type="password"
              value={localLicenseCurrentPassword}
              onChange={(event) => setLocalLicenseCurrentPassword(event.target.value)}
              placeholder="Senha atual"
            />
            <label>Nova senha de renovação</label>
            <input
              type="password"
              value={localLicenseNewPassword}
              onChange={(event) => setLocalLicenseNewPassword(event.target.value)}
              placeholder="Nova senha"
            />
            <button type="button" onClick={() => void changeLocalLicensePassword()} disabled={localLicensePasswordLoading}>
              {localLicensePasswordLoading ? 'Atualizando...' : 'Alterar senha de renovação'}
            </button>
          </div>
        )}
        {mode === 'blocked' && (
          <div className="cash-modal-actions">
            <button type="button" className="danger" onClick={logout}>Sair da conta</button>
          </div>
        )}
      </div>
    );
  }

  function onProductsNavClick(): void {
    if (!menuOpen) {
      setView('produtos');
      return;
    }
    setProductsMenuOpen((current) => !current);
  }

  function onSettingsNavClick(): void {
    if (!menuOpen) {
      setView('backup');
      return;
    }
    setSettingsMenuOpen((current) => !current);
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError('Não foi possivel alternar tela cheia');
    }
  }

  async function saveProfile(): Promise<void> {
    if (!token) return;
    if (!profileNome.trim() || !profileEmail.trim()) {
      setError('Informe nome e e-mail do perfil');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { res, json } = await requestApi<User>('/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: profileNome.trim(),
          email: profileEmail.trim(),
        }),
      });
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao atualizar perfil');
      setUser(json.data);
      if (json.data.id) {
        const profileMetaMap = loadJson<Record<string, ProfileMetadata>>(PROFILE_META_KEY, {});
        profileMetaMap[json.data.id] = {
          celular: profileCelular.trim(),
          dataNascimento: profileDataNascimento,
          documento: profileDocumento.trim(),
          tipoPessoa: profileTipoPessoa,
        };
        saveJson(PROFILE_META_KEY, profileMetaMap);
      }
      setUsuarios((prev) =>
        prev.map((item) =>
          item.id === json.data.id
            ? {
                ...item,
                nome: profileNome.trim(),
                email: profileEmail.trim(),
                celular: profileCelular.trim(),
                dataNascimento: profileDataNascimento,
                documento: profileDocumento.trim(),
                tipoPessoa: profileTipoPessoa,
              }
            : item
        )
      );
      setEditingProfileInfo(false);
      setStatus('Perfil atualizado com sucesso');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }

  async function saveAccountSettings(): Promise<void> {
    if (!token) return;
    const passwordChangeRequested = currentSenha.trim().length > 0 || newSenha.trim().length > 0;
    if (passwordChangeRequested) {
      if (!currentSenha.trim() || !newSenha.trim()) {
        setError('Preencha senha atual e nova senha para alterar a senha');
        return;
      }
      if (newSenha.trim().length < 4) {
        setError('Nova senha deve ter ao menos 4 caracteres');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      if (passwordChangeRequested) {
        const { res, json } = await requestApi<unknown>('/auth/me/password', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            senhaAtual: currentSenha.trim(),
            novaSenha: newSenha.trim(),
          }),
        });
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Falha ao alterar senha');
      }

      const nextSettings = normalizeAccountSettings({
        startView: accountStartView,
        historyPageSize: accountHistoryPageSize,
        confirmLogout: accountConfirmLogout,
        collapsedMenu: accountCollapsedMenu,
      });
      saveJson<AccountSettings>(ACCOUNT_SETTINGS_KEY, nextSettings);
      setHistoryPageSize(nextSettings.historyPageSize);
      setMenuOpen(!nextSettings.collapsedMenu);
      if (user) setView(resolveAccountStartView(user.role, nextSettings.startView));
      setCurrentSenha('');
      setNewSenha('');
      setShowAccountModal(false);
      setStatus(passwordChangeRequested ? 'Configurações e senha atualizadas com sucesso' : 'Configurações da conta salvas com sucesso');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configurações da conta');
    } finally {
      setLoading(false);
    }
  }

  async function performLogout(): Promise<void> {
    if (token) {
      try {
        await requestApi<unknown>('/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Mantem logout local mesmo se API de logout falhar.
      }
    }
    if (document.fullscreenElement) void document.exitFullscreen();
    setToken(null);
    setUser(null);
    setUsuarios([]);
    setFornecedores([]);
    setVendaCaixas([{ id: uid(), itens: [] }]);
    setActiveVendaCaixaIndex(0);
    setLocalLicenseRenewPassword('');
    setLocalLicenseCurrentPassword('');
    setLocalLicenseNewPassword('');
    setLicenseUserId('');
    setLicensePlanType('MONTHLY');
    setLicenseMaxDevices('1');
    setLicenseValidityDays('40');
    setLastCreatedUserLicense(null);
    setShowLogoutModal(false);
    setShowUserMenu(false);
    setView('dashboard');
    setStatus('Sessão encerrada');
    setError('');
  }

  function logout(): void {
    setShowUserMenu(false);
    if (!accountConfirmLogout) {
      void performLogout();
      return;
    }
    setShowLogoutModal(true);
  }

  function cancelLogout(): void {
    setShowLogoutModal(false);
  }

  // Sessao: backup, exportacoes e limpeza de historico.

  function gerarBackupLocal(): void {
    const snapshot: BackupData = {
      version: 1,
      createdAt: new Date().toISOString(),
      data: {
        produtos,
        vendas,
        cashEntries,
        saldoCaixa,
        caixaAberto,
        clientes,
        usuarios,
        fornecedores,
        printerName,
        autoPrint,
      },
    };
    const folder = loadLocalBackupFolder();
    const nextFolder: LocalBackupFolder = {
      folderName: folder.folderName || DEFAULT_BACKUP_FOLDER_NAME,
      backups: [...folder.backups, snapshot].slice(-30),
    };
    saveJson(BACKUP_STORAGE_KEY, nextFolder);
    setLocalBackupFolderName(nextFolder.folderName);
    setLastBackupAt(snapshot.createdAt);
    setStatus(`Backup local salvo na pasta "${nextFolder.folderName}" em ${new Date(snapshot.createdAt).toLocaleString('pt-BR')}`);
    setError('');
  }

  function restaurarBackupLocal(backup: BackupData): void {
    if (!backup?.data) {
      setError('Backup inválido');
      return;
    }
    setProdutos(backup.data.produtos ?? []);
    setVendas(backup.data.vendas ?? []);
    setCashEntries(backup.data.cashEntries ?? []);
    setSaldoCaixa(Number(backup.data.saldoCaixa ?? 0));
    setCaixaAberto(Boolean(backup.data.caixaAberto));
    setClientes(backup.data.clientes ?? []);
    setUsuarios(backup.data.usuarios ?? []);
    setFornecedores(backup.data.fornecedores ?? []);
    setPrinterName(backup.data.printerName ?? 'Impressora térmica 80mm');
    setAutoPrint(Boolean(backup.data.autoPrint));
    setLastBackupAt(backup.createdAt);
    setShowRestoreBackupModal(false);
    setStatus(`Restauração concluída a partir do backup de ${new Date(backup.createdAt).toLocaleString('pt-BR')}`);
    setError('');
  }

  function abrirTelaRestaurarBackup(): void {
    const folder = loadLocalBackupFolder();
    const sortedBackups = [...folder.backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortedBackups.length === 0) {
      setError('Nenhum backup encontrado para restaurar');
      return;
    }
    setLocalBackupFolderName(folder.folderName || DEFAULT_BACKUP_FOLDER_NAME);
    setRestoreBackupCandidates(sortedBackups);
    setShowRestoreBackupModal(true);
    setError('');
  }

  function exportHistoricoExcel(): void {
    const periodMap: Record<'hoje' | '7d' | '30d' | 'custom', string> = {
      hoje: 'Hoje',
      '7d': '7 dias',
      '30d': '30 dias',
      custom: 'Personalizado',
    };
    const periodText = historyPeriod === 'custom' && historyDateFrom && historyDateTo
      ? `${periodMap[historyPeriod]} (${historyDateFrom} até ${historyDateTo})`
      : periodMap[historyPeriod];
    const minText = historyMinValue.trim() ? money(toNum(historyMinValue)) : 'Não informado';
    const maxText = historyMaxValue.trim() ? money(toNum(historyMaxValue)) : 'Não informado';
    const clienteText = historyCliente === 'todos' ? 'Todos' : historyCliente;
    const buscaText = historySearch.trim() || 'Não informado';

    const header = ['ID', 'Cliente', 'Pagamento', 'Status', 'Operador', 'Itens', 'Total', 'Data'];
    const rows = historyFilteredSales.map((item) => [
      item.id,
      item.cliente,
      item.pagamento,
      item.statusVenda,
      item.operador,
      String(item.itensTotal),
      String(toNum(item.total).toFixed(2)).replace('.', ','),
      new Date(item.createdAt).toLocaleString('pt-BR'),
    ]);
    const metadata = [
      ['Relatório', 'Histórico de Vendas'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Período', periodText],
      ['Cliente', clienteText],
      ['Valor mínimo', minText],
      ['Valor máximo', maxText],
      ['Pesquisa', buscaText],
      ['Total de registros', String(historyFilteredSales.length)],
      [],
    ];
    const csv = [...metadata, header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Histórico-de-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function limparHistoricoVendasApi(): Promise<void> {
    if (!token || !canClearSalesHistory) return;

    setError('');
    setStatus('');
    setClearingHistoryLoading(true);
    try {
      type ClearHistoryResult = {
        vendasRemovidas: number;
        movimentosRemovidos: number;
        caixasRemovidos?: number;
        pagamentosRemovidos?: number;
        itensRemovidos?: number;
      };
      const endpoints = ['/caixas/historico', '/vendas/historico'];
      let clearResult: ClearHistoryResult | null = null;
      let lastErrorMessage = 'Erro ao limpar histórico de vendas';

      for (const endpoint of endpoints) {
        try {
          const { res, json } = await requestApi<ClearHistoryResult>(endpoint, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok && json.success) {
            clearResult = json.data;
            break;
          }
          lastErrorMessage = json.message ?? lastErrorMessage;
        } catch (err) {
          lastErrorMessage = err instanceof Error ? err.message : lastErrorMessage;
        }
      }

      if (!clearResult) throw new Error(lastErrorMessage);

      const verifyQuery = new URLSearchParams({ page: '1', limit: '1', _: String(Date.now()) });
      const verify = await requestApi<{ dados: Array<unknown>; total: number }>(`/caixas/historico?${verifyQuery.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (verify.res.ok && verify.json.success && (verify.json.data.total ?? 0) > 0) {
        try {
          await requestApi<ClearHistoryResult>('/caixas/historico', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Ignora erro da segunda tentativa e valida novamente abaixo.
        }

        const reverify = await requestApi<{ dados: Array<unknown>; total: number }>(`/caixas/historico?${verifyQuery.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (reverify.res.ok && reverify.json.success && (reverify.json.data.total ?? 0) > 0) {
          throw new Error('Não foi possível limpar todo o histórico do caixa. Tente novamente.');
        }
      }

      setVendas([]);
      setCashEntries([]);
      setSaldoCaixa(0);
      setCaixaAberto(false);
      saveJson('pdv_vendas', []);
      saveJson('pdv_cash_entries', []);
      saveJson('pdv_cash_balance', 0);
      saveJson('pdv_cash_open', false);
      await Promise.all([loadVendas(token, true), loadCaixaData(token, true, caixaHistoricoFilters)]);
      const vendasRemovidas = clearResult.vendasRemovidas ?? 0;
      const movimentosRemovidos = clearResult.movimentosRemovidos ?? 0;
      setStatus(`Histórico limpo com sucesso (${vendasRemovidas} vendas e ${movimentosRemovidos} movimentos removidos)`);
      setShowClearHistoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar histórico de vendas');
    } finally {
      setClearingHistoryLoading(false);
    }
  }

  function imprimirComprovanteVenda(params: {
    vendaId: string;
    dataPagamento: string;
    operador: string;
    cliente: string;
    cpf?: string;
    itens: Array<{ nome: string; codigo: string | null; quantidade: number; precoUnit: number; subtotal: number }>;
    pagamentos: Array<{ tipo: PaymentType; valor: number; valorRecebido?: number; parcelas?: number }>;
    subtotal: number;
    desconto: number;
    total: number;
    troco: number;
  }): void {
    const esc = (value: string | number): string => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const pagamentoLabel = (tipo: PaymentType): string => {
      if (tipo === 'DINHEIRO') return 'Dinheiro';
      if (tipo === 'PIX') return 'Pix';
      if (tipo === 'CARTAO_CREDITO') return 'Cartão crédito';
      return 'Cartão débito';
    };

    const content = `
      <html>
        <head>
          <title>Comprovante de Venda</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; color: #000; }
            h1, h2, p { margin: 0; }
            .center { text-align: center; }
            .muted { color: #333; font-size: 11px; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
            .item { margin: 4px 0; }
            .item-name { font-size: 12px; font-weight: bold; }
            .totals { margin-top: 4px; }
            .total-final { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>Comprovante de Venda</h2>
            <p class="muted">${esc(printerName)}</p>
            <p class="muted">${esc(new Date().toLocaleString('pt-BR'))}</p>
          </div>
          <div class="line"></div>
          <p class="muted">Venda: ${esc(params.vendaId)}</p>
          <p class="muted">Operador: ${esc(params.operador)}</p>
          <p class="muted">Cliente: ${esc(params.cliente || 'Cliente avulso')}</p>
          <p class="muted">Data pagamento: ${esc(params.dataPagamento)}</p>
          ${params.cpf ? `<p class="muted">CPF: ${esc(params.cpf)}</p>` : ''}
          <div class="line"></div>
          ${params.itens.map((item) => `
            <div class="item">
              <p class="item-name">${esc(item.nome)}</p>
              <p class="muted">${esc(item.codigo ?? '-')}</p>
              <div class="row"><span>${item.quantidade} x ${esc(money(item.precoUnit))}</span><strong>${esc(money(item.subtotal))}</strong></div>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>${esc(money(params.subtotal))}</span></div>
            <div class="row"><span>Desconto</span><span>${esc(money(params.desconto))}</span></div>
            <div class="row total-final"><span>Total</span><span>${esc(money(params.total))}</span></div>
            <div class="row"><span>Troco</span><span>${esc(money(params.troco))}</span></div>
          </div>
          <div class="line"></div>
          ${params.pagamentos.map((pag) => `
            <div class="row"><span>${esc(pagamentoLabel(pag.tipo))}${pag.parcelas ? ` (${pag.parcelas}x)` : ''}</span><span>${esc(money(pag.valor))}</span></div>
          `).join('')}
          <div class="line"></div>
          <p class="center muted">Obrigado pela preferência!</p>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=420,height=720');
    if (!win) {
      setError('Não foi possível abrir a impressão. Libere pop-ups do navegador.');
      return;
    }
    win.document.open();
    win.document.write(content);
    win.document.close();
    win.focus();
    win.print();
  }

  function exportHistoricoPdf(): void {
    const periodMap: Record<'hoje' | '7d' | '30d' | 'custom', string> = {
      hoje: 'Hoje',
      '7d': '7 dias',
      '30d': '30 dias',
      custom: 'Personalizado',
    };
    const periodText = historyPeriod === 'custom' && historyDateFrom && historyDateTo
      ? `${periodMap[historyPeriod]} (${historyDateFrom} até ${historyDateTo})`
      : periodMap[historyPeriod];

    const esc = (value: string | number): string => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const clienteText = historyCliente === 'todos' ? 'Todos' : historyCliente;
    const minText = historyMinValue.trim() ? money(toNum(historyMinValue)) : 'Não informado';
    const maxText = historyMaxValue.trim() ? money(toNum(historyMaxValue)) : 'Não informado';
    const buscaText = historySearch.trim() || 'Não informado';

    const content = `
      <html>
        <head>
          <title>Histórico de Vendas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin: 0 0 6px; }
            .meta { margin-bottom: 14px; font-size: 12px; color: #334155; }
            .meta-line { margin: 2px 0; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #e2e8f0; font-weight: 700; }
            tbody tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Histórico de Vendas</h2>
          <div class="meta">
            <div class="meta-line"><strong>Gerado em:</strong> ${esc(new Date().toLocaleString('pt-BR'))}</div>
            <div class="meta-line"><strong>Período:</strong> ${esc(periodText)}</div>
            <div class="meta-line"><strong>Cliente:</strong> ${esc(clienteText)} | <strong>Valor mínimo:</strong> ${esc(minText)} | <strong>Valor máximo:</strong> ${esc(maxText)}</div>
            <div class="meta-line"><strong>Pesquisa:</strong> ${esc(buscaText)} | <strong>Registros:</strong> ${historyFilteredSales.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Cliente</th><th>Pagamento</th><th>Status</th><th>Operador</th><th>Itens</th><th>Total</th><th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${historyFilteredSales.map((item) => `
                <tr>
                  <td>${esc(item.id.slice(0, 8))}</td>
                  <td>${esc(item.cliente)}</td>
                  <td>${esc(item.pagamento)}</td>
                  <td>${esc(item.statusVenda)}</td>
                  <td>${esc(item.operador)}</td>
                  <td>${item.itensTotal}</td>
                  <td>${esc(money(toNum(item.total)))}</td>
                  <td>${esc(new Date(item.createdAt).toLocaleString('pt-BR'))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) {
      setError('Não foi possivel abrir janela para exportar PDF');
      return;
    }
    win.document.open();
    win.document.write(content);
    win.document.close();
    win.print();
  }

  // Sessao: tabela generica para telas com listagem simples.
  function renderDataTable(title: string, total: number, head: string[], rows: React.ReactNode) {
    return (
      <section className="panel">
        <div className="panel-title-row">
          <h2>{title}</h2>
          {isAdmin && view !== 'baixo-estoque' && view !== 'historico' && view !== 'caixa' && (
            <button type="button" onClick={() => {
              if (view === 'clientes') setShowClienteModal(true);
              if (view === 'usuarios') openNovoUsuarioForm();
              if (view === 'fornecedores') openNovoFornecedorForm();
              if (view === 'produtos') openNovoProdutoModal();
            }}>Adicionar</button>
          )}
        </div>
        <div className="panel-toolbar">
          <input type="text" placeholder="Pesquisar..." value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)} />
          <span>Total: {total}</span>
        </div>
        <div className="table-head compact">{head.map((h) => <span key={h}>{h}</span>)}</div>
        <div className="table-body">{rows}</div>
        <div className="table-footer">
          <div className="table-footer-left">
            <span>Página 1/1 | {total} registros</span>
          </div>
          <div className="pager">
            <button type="button" disabled aria-label="Página anterior">
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            <button type="button" disabled aria-label="Próxima página">
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={`page ${token ? '' : 'login-page'}`}>
      {/* Sessao: tela de login quando ainda nao autenticado. */}
      {!token ? (
        <section className="login-shell">
          <div className="login-head">
            <div className="login-title-wrap">
              <span className="login-brand-icon">
                <FontAwesomeIcon icon={faCartShopping} />
              </span>
              <h2>Sistema de Vendas</h2>
            </div>
            <p className="login-subtitle">Acesse sua conta para continuar</p>
          </div>
          <form onSubmit={login} className="login-form">
            <label className="auth-label">E-mail</label>
            <div className="input-with-icon">
              <span className="input-icon left" aria-hidden="true">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>
              <input
                type="email"
                className="input-has-left-icon"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <label className="auth-label">Senha</label>
            <div className="input-with-icon">
              <span className="input-icon left" aria-hidden="true">
                <FontAwesomeIcon icon={faLock} />
              </span>
              <input
                type={showSenha ? 'text' : 'password'}
                className="input-has-left-icon"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                onKeyUp={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
                onKeyDown={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
                required
              />
              <button
                type="button"
                className="icon-btn password-visibility-btn"
                onClick={() => setShowSenha((current) => !current)}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <FontAwesomeIcon icon={showSenha ? faEyeSlash : faEye} />
              </button>
            </div>
            {capsLockOn && <small className="caps-warning">Caps Lock ativado</small>}
            <div className="login-options">
              <label className="remember-line"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Lembrar senha</span></label>
              <button type="button" className="link-button" onClick={() => void forgotPassword()} disabled={recoveryLoading}>{recoveryLoading ? 'Solicitando...' : 'Esqueci a senha'}</button>
            </div>
            <button type="submit" className="login-submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>
          {localLicenseBlocked && (
            <div className="local-license-login-wrap">
              {renderLocalLicenseRenewContent('login')}
            </div>
          )}
          <small className="login-footer">JG.DEV - 2026</small>
        </section>
      ) : (
        <div className={`cash-layout ${menuOpen ? 'menu-open' : 'menu-closed'}`}>
          {/* Sessao: menu lateral de navegacao principal. */}
          <aside className="cash-sidebar">
            <div className="brand">
              <span className="brand-mark">$</span>
              {menuOpen && <span className="brand-label">Sistema de Vendas</span>}
            </div>
            <nav>
              {allowedViewsForCurrentRole.includes('dashboard') && <button type="button" className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><span className="nav-icon"><FontAwesomeIcon icon={faChartColumn} /></span><span className="nav-label">Painel inicial</span></button>}
              {allowedViewsForCurrentRole.includes('venda') && <button type="button" className={`nav-item ${view === 'venda' ? 'active' : ''}`} onClick={() => setView('venda')}><span className="nav-icon"><FontAwesomeIcon icon={faCartShopping} /></span><span className="nav-label">Realizar venda</span></button>}
              {allowedViewsForCurrentRole.includes('caixa') && <button type="button" className={`nav-item ${view === 'caixa' ? 'active' : ''}`} onClick={() => setView('caixa')}><span className="nav-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></span><span className="nav-label">Gerenciar caixa</span></button>}

              {allowedViewsForCurrentRole.includes('produtos') && (
                <>
                  <button type="button" className="nav-item nav-parent" onClick={onProductsNavClick}><span className="nav-icon"><FontAwesomeIcon icon={faBoxOpen} /></span><span className="nav-label">Produtos</span>{menuOpen && <span className="nav-caret"><FontAwesomeIcon icon={productsMenuOpen ? faAngleDown : faAngleRight} /></span>}</button>
                  {menuOpen && productsMenuOpen && (<><button type="button" className={`nav-item sub ${view === 'produtos' ? 'active' : ''}`} onClick={() => setView('produtos')}><span className="nav-icon"><FontAwesomeIcon icon={faList} /></span><span className="nav-label">Todos produtos</span></button><button type="button" className={`nav-item sub ${view === 'baixo-estoque' ? 'active' : ''}`} onClick={() => setView('baixo-estoque')}><span className="nav-icon"><FontAwesomeIcon icon={faTriangleExclamation} /></span><span className="nav-label">Baixo estoque</span></button></>)}
                </>
              )}
              {isAdmin && <button type="button" className={`nav-item ${view === 'usuarios' ? 'active' : ''}`} onClick={() => setView('usuarios')}><span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span><span className="nav-label">Usuários</span></button>}
              {isAdmin && <button type="button" className={`nav-item ${view === 'fornecedores' ? 'active' : ''}`} onClick={() => setView('fornecedores')}><span className="nav-icon"><FontAwesomeIcon icon={faUserGroup} /></span><span className="nav-label">Fornecedores</span></button>}
              {allowedViewsForCurrentRole.includes('historico') && <button type="button" className={`nav-item ${view === 'historico' ? 'active' : ''}`} onClick={() => setView('historico')}><span className="nav-icon"><FontAwesomeIcon icon={faClockRotateLeft} /></span><span className="nav-label">Histórico de vendas</span></button>}
              {canAccessSystemSettings && <button type="button" className="nav-item nav-parent" onClick={onSettingsNavClick}><span className="nav-icon"><FontAwesomeIcon icon={faGear} /></span><span className="nav-label">Configurar sistema</span>{menuOpen && <span className="nav-caret"><FontAwesomeIcon icon={settingsMenuOpen ? faAngleDown : faAngleRight} /></span>}</button>}
              {menuOpen && settingsMenuOpen && canAccessSystemSettings && (
                <>
                  <button type="button" className={`nav-item sub ${view === 'impressoras' ? 'active' : ''}`} onClick={() => setView('impressoras')}>
                    <span className="nav-icon"><FontAwesomeIcon icon={faFileInvoiceDollar} /></span>
                    <span className="nav-label">Impressoras</span>
                  </button>
                  <button type="button" className={`nav-item sub ${view === 'backup' ? 'active' : ''}`} onClick={() => setView('backup')}>
                    <span className="nav-icon"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
                    <span className="nav-label">Backup</span>
                  </button>
                  <button type="button" className={`nav-item sub ${view === 'licenca' ? 'active' : ''}`} onClick={() => setView('licenca')}>
                    <span className="nav-icon"><FontAwesomeIcon icon={faLock} /></span>
                    <span className="nav-label">Licença local</span>
                  </button>
                </>
              )}
            </nav>
          </aside>

          <main className="cash-main">
            {/* Sessao: barra superior com atalhos globais. */}
            <header className="cash-topbar">
              <button type="button" className="menu-btn" onClick={() => setMenuOpen((current) => !current)}><FontAwesomeIcon icon={faBars} /></button>
              <div className="topbar-title">{titleForView(view)}</div>
              {isAdmin && localLicenseStatus && (
                <div className={`license-pill ${localLicenseWarn ? 'warning' : ''} ${localLicenseBlocked ? 'blocked' : ''}`}>
                  {localLicenseBlocked
                    ? 'Licença expirada'
                    : `${localLicenseStatus.diasRestantes} dia(s) de licença`}
                </div>
              )}
              <div className="cash-controls">
                <button type="button" className={`icon-square ${isFullscreen ? 'active' : ''}`} onClick={() => void toggleFullscreen()}><FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} /></button>
                <div className="user-menu-wrap" ref={userMenuRef}>
                  <button type="button" className={`user-chip ${showUserMenu ? 'open' : ''}`} onClick={() => setShowUserMenu((current) => !current)}>
                    <span>{user?.nome?.trim() || (user?.role === 'ADMIN' ? 'Administrador' : 'Operador')}</span>
                    <span className="user-chip-arrow"><FontAwesomeIcon icon={faAngleDown} /></span>
                  </button>
                  {showUserMenu && (
                    <div className="user-dropdown">
                      <button
                        type="button"
                        className="user-dropdown-item"
                        onClick={() => {
                          setView('perfil');
                          setEditingProfileInfo(false);
                          setShowUserMenu(false);
                        }}
                      >
                      <FontAwesomeIcon icon={faUser} />
                      <span className="item-icon">Meu perfil</span>  
                      </button>
                      <button
                        type="button"
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowAccountModal(true);
                          setShowUserMenu(false);
                        }}
                      >

                      <span className="item-icon">
                      <FontAwesomeIcon icon={faGear} />
                      </span>
                      <span>Configurações da conta</span>
                      </button>
                      
                      <button type="button" className="user-dropdown-item danger" onClick={logout}>
                      <span className="item-icon">
                      <FontAwesomeIcon icon={faArrowRightFromBracket} />
                      </span>
                      <span>Sair da conta</span>
                    </button>

                    </div>
                  )}
                </div>
                
              </div>
            </header>
            {view === 'dashboard' && (
              /* Sessao: visao de dashboard com KPIs e grafico. */
              <section className="dashboard-shell">
                <div className="dashboard-cards-grid">
                  {[
                    { key: 'vendas', title: 'Vendas/mês', value: money(dashboardMetrics.vendasMes), var: dashboardMetrics.vendasVar, icon: <FontAwesomeIcon icon={faFileInvoiceDollar} />, data: dashboardSparklines.vendas, target: 'historico' as ViewKey },
                    { key: 'produtos', title: 'Total de produtos', value: String(dashboardMetrics.totalProdutos), var: dashboardMetrics.produtosVar, icon: <FontAwesomeIcon icon={faSackDollar} />, data: dashboardSparklines.produtos, target: 'produtos' as ViewKey },
                    { key: 'baixo', title: 'Baixo estoque', value: String(dashboardMetrics.baixo), var: dashboardMetrics.baixoVar, icon: <FontAwesomeIcon icon={faTriangleExclamation} />, data: dashboardSparklines.baixo, target: 'baixo-estoque' as ViewKey },
                    { key: 'usuarios', title: 'Usuários', value: String(dashboardMetrics.totalUsuarios), var: dashboardMetrics.usuariosVar, icon: <FontAwesomeIcon icon={faUsers} />, data: dashboardSparklines.usuarios, target: 'usuarios' as ViewKey },
                  ].map((card) => (
                    <button type="button" className={`dashboard-kpi ${card.key}`} key={card.key} onClick={() => setView(card.target)}>
                      <div className="dashboard-kpi-head">
                        <span className="dashboard-kpi-icon">{card.icon}</span>
                        <h4>{card.title}</h4>
                      </div>
                      <strong>{card.value}</strong>
                      <div className="dashboard-kpi-foot">
                        <span className={card.var >= 0 ? 'trend-up' : 'trend-down'}>
                          {card.var >= 0 ? '↑' : '↓'} {Math.abs(card.var).toFixed(1)}%
                        </span>
                        <div className="sparkline">
                          {card.data.map((v, idx) => {
                            const max = Math.max(1, ...card.data);
                            return <span key={`${card.key}-${idx}`} style={{ height: `${Math.max(8, (v / max) * 26)}px` }} />;
                          })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="dashboard-main-grid">
                  <section className="panel dashboard-chart-panel">
                    <div className="panel-title-row">
                      <h2>Receita e Lucro semanal</h2>
                      <div className="dashboard-period-filter">
                        <label>Período</label>
                        <select value={dashboardPeriod} onChange={(event) => setDashboardPeriod(event.target.value as '7d' | '30d' | 'mes' | 'ano')}>
                          <option value="7d">7 dias</option>
                          <option value="30d">30 dias</option>
                          <option value="mes">Mês</option>
                          <option value="ano">Ano</option>
                        </select>
                      </div>
                    </div>
                    <div className="dashboard-simple-chart">
                      <div className="dashboard-simple-legend">
                        <span><i className="dot receita" />Receita</span>
                        <span><i className="dot lucro" />Lucro</span>
                      </div>
                      <div className="dashboard-simple-bars" style={{ gridTemplateColumns: `repeat(${dashboardMainChart.labels.length}, minmax(0, 1fr))` }}>
                        {dashboardMainChart.labels.map((label, idx) => {
                          const receita = dashboardMainChart.receita[idx] ?? 0;
                          const lucro = dashboardMainChart.lucro[idx] ?? 0;
                          const receitaHeight = (receita / dashboardMainChart.max) * 100;
                          const lucroHeight = (lucro / dashboardMainChart.max) * 100;
                          return (
                            <div className="dashboard-simple-col" key={label} title={`${label} | Receita: ${money(receita)} | Lucro: ${money(lucro)}`}>
                              <div className="dashboard-simple-bar-wrap">
                                <span className="bar receita" style={{ height: `${Math.max(4, receitaHeight)}%` }} />
                                <span className="bar lucro" style={{ height: `${Math.max(4, lucroHeight)}%` }} />
                              </div>
                              <small>{label}</small>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              </section>
            )}
            {view === 'perfil' && (
              <section className="panel profile-tab-panel">
                <div className="profile-system-head">
                  <h3>Perfil do usuário</h3>
                  <p>Conta / <span>Meu perfil</span></p>
                </div>

                <section className="profile-system-section">
                  <h4>Informações pessoais</h4>
                  <div className="profile-system-card">
                    <div className="profile-system-identity">
                      <span className="profile-system-avatar">{(profileNome.trim().charAt(0) || 'U').toUpperCase()}</span>
                      <div>
                        <strong>{profileNome || user?.nome || 'Operador'}</strong>
                        <small>{isAdmin ? 'Administrador master' : 'Operador de caixa'}</small>
                        <small>{profileEmail || user?.email || 'sem-email@local'}</small>
                      </div>
                    </div>
                    <div className="profile-system-lines">
                      <p><span className="tag"><FontAwesomeIcon icon={faHashtag} /></span>{profileHandle}</p>
                      <p><span className="tag"><FontAwesomeIcon icon={faPhone} /></span>{profileCelular || '(--)'}</p>
                      <p><span className="tag"><FontAwesomeIcon icon={faEnvelope} /></span>{profileEmail || 'admin@gmail.com'}</p>
                    </div>
                    <button type="button" className="profile-system-edit" onClick={() => setEditingProfileInfo((current) => !current)}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                  </div>
                  {editingProfileInfo && (
                    <div className="profile-system-edit-form">
                      <div className="profile-system-edit-grid">
                        <div>
                          <label>Nome *</label>
                          <input value={profileNome} onChange={(event) => setProfileNome(event.target.value)} />
                        </div>
                        <div>
                          <label>Celular</label>
                          <input value={profileCelular} onChange={(event) => setProfileCelular(event.target.value)} placeholder="Inserir o celular" />
                        </div>
                        <div>
                          <label>E-mail *</label>
                          <input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
                        </div>
                        <div>
                          <label>Data de nascimento</label>
                          <input type="date" value={profileDataNascimento} onChange={(event) => setProfileDataNascimento(event.target.value)} />
                        </div>
                        <div>
                          <label>{profileTipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}</label>
                          <input
                            value={profileDocumento}
                            onChange={(event) => setProfileDocumento(event.target.value)}
                            placeholder={profileTipoPessoa === 'PF' ? 'Informe o CPF' : 'Informe o CNPJ'}
                          />
                        </div>
                        <div>
                          <label>Tipo pessoa</label>
                          <select
                            className="profile-type-select"
                            value={profileTipoPessoa}
                            onChange={(event) => setProfileTipoPessoa(event.target.value as 'PF' | 'PJ')}
                          >
                            <option value="PF">PF</option>
                            <option value="PJ">PJ</option>
                          </select>
                        </div>
                        <div>
                          <label>Nível de acesso</label>
                          <input value={user?.role === 'ADMIN' ? 'Administrador' : 'Funcionário'} readOnly />
                        </div>
                      </div>
                      <div className="cash-modal-actions">
                        <button type="button" onClick={() => setEditingProfileInfo(false)}>Cancelar</button>
                        <button type="button" onClick={() => void saveProfile()} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            )}
            {view === 'venda' && (
              /* Sessao: operacao de venda com busca, carrinho e resumo. */
              <>
                <section className="venda-shell">
                  <div className="venda-top-row">
                    <div className="venda-left-head">
                      <button type="button" className="venda-round-btn" onClick={() => navigateVendaCaixa(-1)} disabled={showPaymentModal}>
                        <FontAwesomeIcon icon={faAngleLeft} />
                      </button>
                      <button type="button" className="venda-operator-btn">
                        <FontAwesomeIcon icon={faCartShopping} />
                        <span>{user?.nome || 'Operador'} | Caixa {activeVendaCaixaIndex + 1}</span>
                      </button>
                    </div>
                    <div className="venda-right-head">
                      <button type="button" className="venda-round-btn" onClick={() => navigateVendaCaixa(1)} disabled={showPaymentModal}>
                        <FontAwesomeIcon icon={faAngleRight} />
                      </button>
                      <button type="button" className="venda-add-btn" onClick={createVendaCaixa} disabled={showPaymentModal}>+</button>
                      <button type="button" className="venda-remove-btn" onClick={requestRemoveActiveVendaCaixa} disabled={showPaymentModal || vendaCaixas.length <= 1}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <span className="venda-counter">{activeVendaCaixaIndex + 1}/{vendaCaixas.length}</span>
                    </div>
                  </div>

                  <div className="venda-toolbar-row">
                    <div className="venda-search-wrap">
                      <div className="search-suggest-wrap">
                        <input
                          type="text"
                          placeholder="Buscar produto por nome, código de barras ou ID"
                          value={searchVenda}
                          onChange={(event) => {
                            setSearchVenda(event.target.value);
                            setActiveVendaSuggestionIndex(-1);
                          }}
                          disabled={showPaymentModal}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                              event.preventDefault();
                              if (vendaSuggestionItems.length === 0) return;
                              setActiveVendaSuggestionIndex((current) => (current + 1) % vendaSuggestionItems.length);
                              return;
                            }
                            if (event.key === 'ArrowUp') {
                              event.preventDefault();
                              if (vendaSuggestionItems.length === 0) return;
                              setActiveVendaSuggestionIndex((current) => (current <= 0 ? vendaSuggestionItems.length - 1 : current - 1));
                              return;
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              setSearchVenda('');
                              setVendaSuggestions([]);
                              setActiveVendaSuggestionIndex(-1);
                              return;
                            }
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const selected = activeVendaSuggestionIndex >= 0
                                ? vendaSuggestionItems[activeVendaSuggestionIndex]
                                : vendaSuggestionItems[0];
                              if (selected) selecionarSugestaoVenda(selected);
                            }
                          }}
                        />
                        {searchVenda.trim().length > 0 && (
                          <div className="search-suggestions">
                            {loadingVendaSuggestions ? (
                              <div className="search-suggestion-empty">Buscando produtos...</div>
                            ) : vendaSuggestionItems.length === 0 ? (
                              <div className="search-suggestion-empty">Nenhum produto encontrado</div>
                            ) : (
                              vendaSuggestionItems.map((item, index) => (
                                <button
                                  key={`suggest-${item.id}`}
                                  type="button"
                                  className={`search-suggestion-item ${activeVendaSuggestionIndex === index ? 'active' : ''}`}
                                  onClick={() => {
                                    selecionarSugestaoVenda(item);
                                  }}
                                  onMouseEnter={() => setActiveVendaSuggestionIndex(index)}
                                >
                                  <span>{item.nome}</span>
                                  <small>{item.codigo ?? item.id}</small>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" className="venda-search-icon" tabIndex={-1} aria-hidden="true">
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </button>
                    </div>

                    <div className="venda-actions">
                      <button type="button" className="venda-action-btn primary" onClick={abrirModalPagamento} disabled={loading || showPaymentModal}>Finalizar venda</button>
                      <button type="button" className="venda-action-btn danger" onClick={clearActiveCart} disabled={showPaymentModal}>Cancelar venda</button>
                    </div>
                  </div>
                </section>

                <div className="workspace venda-workspace">
                  <section className="panel sales-table-panel venda-table-panel">
                    <div className="table-head venda-head"><span>#</span><span>Produto</span><span>Código de Barras</span><span>Itens</span><span>Preço</span><span>Total</span></div>
                    <div className="table-body venda-table-body">
                      {cart.length === 0 ? (
                        <p className="venda-empty-text">Caixa Livre</p>
                      ) : (
                        cart.map((item, index) => (
                          <div className="table-row venda-row" key={item.produto.id}>
                            <span>{index + 1}</span>
                            <span>{item.produto.nome}</span>
                            <span>{item.produto.codigo ?? '-'}</span>
                            <span><input type="number" min={1} max={item.produto.estoque} value={item.quantidade} disabled={showPaymentModal} onChange={(event) => updateQuantity(item.produto.id, Number(event.target.value))} /></span>
                            <span>{money(toNum(item.produto.preco))}</span>
                            <span>{money(toNum(item.produto.preco) * item.quantidade)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="panel venda-summary-panel">
                    <h2>Itens: {cart.reduce((sum, item) => sum + item.quantidade, 0)}</h2>
                    <p>Total: {money(totalCarrinho)}</p>
                  </section>
                </div>
              </>
            )}

            {view === 'caixa' && (
              /* Sessao: gestao de caixa e historico de movimentos. */
              <section className="caixa-v2-shell">
                <div className="caixa-v2-cards dashboard-cards-grid">
                  {caixaSummaryCards.map((card) => {
                    const max = Math.max(1, ...card.data);
                    return (
                      <button
                        type="button"
                        className={`dashboard-kpi caixa-kpi ${card.key}`}
                        key={card.key}
                        onClick={() => handleCaixaSummaryCardClick(card.key)}
                      >
                        <div className="dashboard-kpi-head">
                          <span className="dashboard-kpi-icon">{card.icon}</span>
                          <h4>{card.title}</h4>
                        </div>
                        <strong>{card.value}</strong>
                        <div className="dashboard-kpi-foot">
                          <span className={card.var >= 0 ? 'trend-up' : 'trend-down'}>
                            {card.var >= 0 ? '↑' : '↓'} {Math.abs(card.var).toFixed(1)}%
                          </span>
                          <div className="sparkline">
                            {card.data.map((value, index) => (
                              <span key={`${card.key}-${index}`} style={{ height: `${Math.max(8, (value / max) * 26)}px` }} />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="caixa-v2-title-row">
                  <h2>Histórico de vendas</h2>
                  <div className="caixa-v2-actions">
                    <button type="button" className="caixa-v2-btn blue" onClick={fecharCaixa} disabled={!caixaAberto}>Fechar Caixa</button>
                    <button type="button" className="caixa-v2-btn green" onClick={() => setShowFlowModal('SUPRIMENTO')} disabled={!caixaAberto}>Suprimento</button>
                    <button type="button" className="caixa-v2-btn red" onClick={() => setShowFlowModal('SANGRIA')} disabled={!caixaAberto}>Sangria</button>
                    {canClearSalesHistory && (
                      <button type="button" className="caixa-v2-btn red" onClick={() => setShowClearHistoryModal(true)} disabled={clearingHistoryLoading}>
                        Limpar histórico
                      </button>
                    )}
                  </div>
                </div>

                <section className="panel caixa-v2-panel">
                  <div className="caixa-v2-search">
                    <span className="caixa-v2-search-icon"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                    <input type="text" placeholder="Pesquisar..." value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)} />
                  </div>
                  <div className="caixa-v2-filters">
                    <div className="caixa-filter-field">
                      <label>Horário inicial</label>
                      <input type="datetime-local" value={caixaReportFrom} onChange={(event) => setCaixaReportFrom(event.target.value)} />
                    </div>
                    <div className="caixa-filter-field">
                      <label>Horário final</label>
                      <input type="datetime-local" value={caixaReportTo} onChange={(event) => setCaixaReportTo(event.target.value)} />
                    </div>
                    <div className="caixa-filter-field">
                      <label>Usuário</label>
                      <select
                        value={isAdmin ? caixaReportOperadorId : (user?.id ?? 'todos')}
                        onChange={(event) => setCaixaReportOperadorId(event.target.value)}
                        disabled={!isAdmin}
                      >
                        {isAdmin && <option value="todos">Todos os usuários</option>}
                        {caixaOperadoresDisponiveis.map((item) => (
                          <option key={item.id} value={item.id}>{item.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="caixa-filter-actions">
                      <button type="button" className="caixa-v2-btn blue" onClick={() => void aplicarFiltrosRelatorioCaixa()}>
                        Aplicar filtro
                      </button>
                      <button type="button" className="caixa-v2-btn red" onClick={limparFiltrosRelatorioCaixa}>
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="table-head caixa-v2-head">
                    <span>Tipo</span>
                    <span>Usuário</span>
                    <span>Descrição</span>
                    <span>Desconto</span>
                    <span>Pagamento</span>
                    <span>Total</span>
                    <span>Data</span>
                  </div>
                  <div className="table-body caixa-v2-body">
                    {cashEntriesFiltrados.length === 0 ? (
                      <p className="empty-text">Nenhum registro encontrado</p>
                    ) : (
                      cashEntriesFiltrados.map((item) => (
                        <div className="table-row caixa-v2-row" key={item.id}>
                          <span><small className="caixa-v2-type">{item.tipo === 'ABERTURA' ? 'Abertura' : item.tipo}</small></span>
                          <span>{item.operadorNome ?? 'Operador'}</span>
                          <span>{item.descricao}</span>
                          <span>======</span>
                          <span>======</span>
                          <span>{money(item.total)}</span>
                          <span>{new Date(item.data).toLocaleString('pt-BR')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {view === 'clientes' &&
              renderDataTable(
                'Clientes',
                clientesFiltrados.length,
                ['#', 'Nome', 'Celular', 'Limite', 'Uso', 'Status'],
                clientesFiltrados.length === 0 ? (
                  <p className="empty-text">Nenhum registro encontrado</p>
                ) : (
                  clientesFiltrados.map((item, index) => (
                    <div className="table-row compact" key={item.id}>
                      <span>{index + 1}</span>
                      <span>{item.nome}</span>
                      <span>{item.celular || '-'}</span>
                      <span>{money(item.limiteTotal)}</span>
                      <span>{money(item.creditoUso)}</span>
                      <span>{item.status}</span>
                    </div>
                  ))
                )
              )}

            {view === 'produtos' && (
              <section className="produtos-v2-shell">
                <div className="produtos-v2-header">
                  <h2>Todos os produtos</h2>
                  <div className="produtos-v2-header-actions">
                    <p>Dashboard / <span>Todos os produtos</span></p>
                    <button type="button" onClick={openNovoProdutoModal}>Adicionar</button>
                  </div>
                </div>
                <section className="panel produtos-v2-panel">
                  <div className="produtos-v2-toolbar">
                    <div className="produtos-v2-search">
                      <span><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                      <input type="text" placeholder="Pesquisar..." value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)} />
                    </div>
                    <strong>Total de produtos: {produtosFiltrados.length}</strong>
                  </div>
                  <div className="table-head produtos-v2-head">
                    <span>#</span>
                    <span>Nome</span>
                    <span>Código de Barras</span>
                    <span>Preço Venda</span>
                    <span>Preço Custo</span>
                    <span>Estoque</span>
                    <span>Validade</span>
                    <span>Ações</span>
                  </div>
                  <div className="table-body produtos-v2-body">
                    {produtosFiltrados.length === 0 ? (
                      <p className="empty-text">Nenhum registro encontrado</p>
                    ) : (
                      produtosFiltrados.map((item, index) => (
                        <div className="table-row produtos-v2-row" key={item.id}>
                          <span>{index + 1}</span>
                          <span className="product-name">{item.nome}</span>
                          <span>{item.codigo ?? '-'}</span>
                          <span className="price-cell">{moneyField(toNum(item.preco))}</span>
                          <span>{moneyField(Math.max(0, toNum(item.preco) * 0.67))}</span>
                          <span>{item.estoque}</span>
                          <span>-</span>
                          <span className="table-actions produtos-v2-actions">
                            <button type="button" className="icon-action print" title="Imprimir preço" onClick={() => abrirImpressaoProduto(item)}>
                              <FontAwesomeIcon icon={faPrint} />
                            </button>
                            <button type="button" className="icon-action warn" title="Editar produto" onClick={() => abrirEdicaoProduto(item)} disabled={!canManageProducts}>
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button type="button" className="icon-action danger" title="Excluir produto" onClick={() => void removerProdutoApi(item.id)} disabled={!canManageProducts}>
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {view === 'baixo-estoque' &&
              renderDataTable(
                'Produtos com baixo estoque',
                baixoEstoque.length,
                ['Número', 'Nome', 'Código', 'Preço', 'Estoque'],
                baixoEstoque.length === 0 ? (
                  <p className="empty-text">Nenhum registro encontrado</p>
                ) : (
                  baixoEstoque.map((item, index) => (
                    <div className="table-row compact" key={item.id}>
                      <span>{index + 1}</span>
                      <span>{item.nome}</span>
                      <span>{item.codigo ?? '-'}</span>
                      <span>{money(toNum(item.preco))}</span>
                      <span>{item.estoque}</span>
                    </div>
                  ))
                )
              )}

            {view === 'usuarios' && (
              <section className="usuarios-shell">
                {!showUsuarioForm ? (
                  <>
                    <div className="usuarios-header-row">
                      <h2>Usuários</h2>
                      <div className="usuarios-header-actions">
                        <p>Dashboard / <span>Usuários</span></p>
                        <button type="button" onClick={openNovoUsuarioForm}>Adicionar</button>
                      </div>
                    </div>
                    <section className="panel usuarios-table-panel">
                      <div className="usuarios-toolbar">
                        <div className="usuarios-search">
                          <span><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                          <input type="text" placeholder="Pesquisar..." value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)} />
                        </div>
                        <strong>Total de usuários: {usuariosFiltrados.length}</strong>
                      </div>
                      <div className="table-head usuarios-head">
                        <span>#</span>
                        <span>Nome</span>
                        <span>Email</span>
                        <span>Celular</span>
                        <span>Data de nascimento</span>
                        <span>Permissão</span>
                        <span>Ações</span>
                      </div>
                      <div className="table-body usuarios-body">
                        {usuariosFiltrados.length === 0 ? (
                          <p className="empty-text">Nenhum registro encontrado</p>
                        ) : (
                          usuariosFiltrados.map((item, index) => (
                            <div className="table-row usuarios-row" key={item.id}>
                              <span>{index + 1}</span>
                              <span>{item.nome}</span>
                              <span>{item.email}</span>
                              <span>{item.celular || '-'}</span>
                              <span>{item.dataNascimento || '-'}</span>
                              <span>{item.permissao}</span>
                              <span className="usuarios-actions">
                                <button type="button" className="icon-action warn" onClick={() => void openEditarUsuarioForm(item)}><FontAwesomeIcon icon={faPenToSquare} /></button>
                                <button type="button" className="icon-action danger" onClick={() => void removeUsuario(item.id)}><FontAwesomeIcon icon={faTrash} /></button>
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="panel usuarios-form-panel">
                    <div className="usuarios-form-top">
                      <button type="button" className="usuarios-close-btn" onClick={closeUsuarioForm}>×</button>
                    </div>
                    <div className="usuarios-form-head">
                      <h2>{editingUsuarioId ? 'Editar usuário' : 'Adicionar novo usuário'}</h2>
                      <p>Dashboard / <span>{editingUsuarioId ? 'Editar usuário' : 'Adicionar novo usuário'}</span></p>
                    </div>
                    <div className="usuarios-form-grid">
                      <div>
                        <label>Usuário *</label>
                        <input value={usuarioNome} onChange={(event) => setUsuarioNome(event.target.value)} placeholder="Nome do usuário" />
                      </div>
                      <div>
                        <label>Celular</label>
                        <input value={usuarioCelular} onChange={(event) => setUsuarioCelular(event.target.value)} placeholder="Inserir o celular" />
                      </div>
                      <div>
                        <label>Data de nascimento</label>
                        <input type="date" value={usuarioDataNascimento} onChange={(event) => setUsuarioDataNascimento(event.target.value)} />
                      </div>
                      <div>
                        <label>E-mail</label>
                        <input value={usuarioEmail} onChange={(event) => setUsuarioEmail(event.target.value)} placeholder="Inserir o e-mail" />
                      </div>
                      <div>
                        <label>Nível de acesso *</label>
                        <select value={usuarioPermissao} onChange={(event) => setUsuarioPermissao(event.target.value as Usuario['permissao'])}>
                          <option value="Nenhum">Nenhum</option>
                          <option value="Administrador">Administrador</option>
                          <option value="Funcionario">Funcionário</option>
                        </select>
                      </div>
                      <div className="usuarios-doc-wrap">
                        <div>
                          <label>{usuarioTipoPessoa === 'PF' ? 'CPF do usuário' : 'CNPJ do usuário'}</label>
                          <input value={usuarioDocumento} onChange={(event) => setUsuarioDocumento(event.target.value)} placeholder={usuarioTipoPessoa === 'PF' ? 'Informe o CPF' : 'Informe o CNPJ'} />
                        </div>
                        <div>
                          <label>Tipo pessoa</label>
                          <div className="usuarios-tipo-toggle">
                            <button type="button" className={usuarioTipoPessoa === 'PF' ? 'active pf' : ''} onClick={() => setUsuarioTipoPessoa('PF')}>PF</button>
                            <button type="button" className={usuarioTipoPessoa === 'PJ' ? 'active pj' : ''} onClick={() => setUsuarioTipoPessoa('PJ')}>PJ</button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label>Inserir senha *</label>
                        <input type="password" value={usuarioSenha} onChange={(event) => setUsuarioSenha(event.target.value)} placeholder="Inserir senha" />
                      </div>
                      <div>
                        <label>Repetir senha *</label>
                        <input type="password" value={usuarioSenhaConfirm} onChange={(event) => setUsuarioSenhaConfirm(event.target.value)} placeholder="Repita a senha" />
                      </div>
                    </div>
                    <div className="usuarios-form-actions">
                      <button type="button" className="secondary" onClick={resetUsuarioForm}>Resetar</button>
                      <button type="button" onClick={() => void saveUsuarioForm()}>Salvar usuário</button>
                    </div>
                  </section>
                )}
              </section>
            )}

            {view === 'fornecedores' && (
              <section className="fornecedores-shell">
                {!showFornecedorForm ? (
                  <>
                    <div className="usuarios-header-row">
                      <h2>Fornecedores</h2>
                      <div className="usuarios-header-actions">
                        <p>Dashboard / <span>Fornecedores</span></p>
                        <button type="button" onClick={openNovoFornecedorForm}>Adicionar</button>
                      </div>
                    </div>
                    <section className="panel usuarios-table-panel">
                      <div className="usuarios-toolbar">
                        <div className="usuarios-search">
                          <span><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                          <input type="text" placeholder="Pesquisar..." value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)} />
                        </div>
                        <strong>Total de fornecedores: {fornecedoresFiltrados.length}</strong>
                      </div>
                      <div className="table-head usuarios-head">
                        <span>#</span>
                        <span>Nome</span>
                        <span>Email</span>
                        <span>Celular</span>
                        <span>Data de cadastro</span>
                        <span>Status</span>
                        <span>Ações</span>
                      </div>
                      <div className="table-body usuarios-body">
                        {fornecedoresFiltrados.length === 0 ? (
                          <p className="empty-text">Nenhum registro encontrado</p>
                        ) : (
                          fornecedoresFiltrados.map((item, index) => (
                            <div className="table-row usuarios-row" key={item.id}>
                              <span>{index + 1}</span>
                              <span>{item.nome}</span>
                              <span>{item.email || '-'}</span>
                              <span>{item.celular || '-'}</span>
                              <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                              <span>Ativo</span>
                              <span className="usuarios-actions">
                                <button type="button" className="icon-action warn" onClick={() => openEditarFornecedorForm(item)}><FontAwesomeIcon icon={faPenToSquare} /></button>
                                <button type="button" className="icon-action danger" onClick={() => void removeFornecedor(item.id)}><FontAwesomeIcon icon={faTrash} /></button>
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="panel fornecedor-form-panel">
                    <div className="fornecedor-form-top">
                      <button type="button" className="usuarios-close-btn" onClick={closeFornecedorForm}>×</button>
                    </div>
                    <div className="usuarios-form-head">
                      <h2>{editingFornecedorId ? 'Editar fornecedor' : 'Adicionar novo fornecedor'}</h2>
                      <p>Dashboard / <span>{editingFornecedorId ? 'Editar fornecedor' : 'Adicionar novo fornecedor'}</span></p>
                    </div>
                    <div className="fornecedor-form-grid">
                      <div>
                        <label>Fornecedor *</label>
                        <input value={fornecedorNome} onChange={(event) => setFornecedorNome(event.target.value)} placeholder="Nome do fornecedor" />
                      </div>
                      <div>
                        <label>Celular</label>
                        <input value={fornecedorCelular} onChange={(event) => setFornecedorCelular(event.target.value)} placeholder="Inserir o celular" />
                      </div>
                      <div className="fornecedor-form-full">
                        <label>E-mail</label>
                        <input value={fornecedorEmail} onChange={(event) => setFornecedorEmail(event.target.value)} placeholder="Inserir o e-mail" />
                      </div>
                    </div>
                    <div className="usuarios-form-actions">
                      <button type="button" className="secondary" onClick={resetFornecedorForm}>Resetar</button>
                      <button type="button" onClick={() => void saveFornecedorForm()}>{editingFornecedorId ? 'Salvar alterações' : 'Salvar'}</button>
                    </div>
                  </section>
                )}
              </section>
            )}

            {view === 'historico' && (
              /* Sessao: historico de vendas com filtros e exportacao. */
              <section className="history-shell">
                <div className="history-summary-grid dashboard-cards-grid">
                  {historySummaryCards.map((card) => {
                    const max = Math.max(1, ...card.data);
                    return (
                      <article className={`dashboard-kpi history-kpi ${card.key}`} key={card.key}>
                        <div className="dashboard-kpi-head">
                          <span className="dashboard-kpi-icon">{card.icon}</span>
                          <h4>{card.title}</h4>
                        </div>
                        <strong>{card.value}</strong>
                        <div className="dashboard-kpi-foot">
                          <span className={card.var >= 0 ? 'trend-up' : 'trend-down'}>
                            {card.var >= 0 ? '↑' : '↓'} {Math.abs(card.var).toFixed(1)}%
                          </span>
                          <div className="sparkline">
                            {card.data.map((value, index) => (
                              <span key={`${card.key}-${index}`} style={{ height: `${Math.max(8, (value / max) * 26)}px` }} />
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="history-title-row">
                  <h2>Histórico de vendas</h2>
                  <button
                    type="button"
                    className="history-refresh-btn"
                    onClick={() => {
                      if (token) void loadVendas(token);
                    }}
                  >
                    Atualizar
                  </button>
                </div>

                <div className="panel history-filters history-filters-v2">
                  <div className="history-compact-controls">
                    <button type="button" className="history-nav-btn" onClick={() => shiftHistoryCustomRange(-1)}>&larr;</button>
                    <div className="history-date-box">
                      <label>Data inicial</label>
                      <input
                        type="date"
                        value={historyDateFrom}
                        onChange={(event) => {
                          setHistoryPeriod('custom');
                          setHistoryDateFrom(event.target.value);
                        }}
                      />
                    </div>
                    <div className="history-date-box">
                      <label>Data final</label>
                      <input
                        type="date"
                        value={historyDateTo}
                        onChange={(event) => {
                          setHistoryPeriod('custom');
                          setHistoryDateTo(event.target.value);
                        }}
                      />
                    </div>
                    <button type="button" className="history-nav-btn" onClick={() => shiftHistoryCustomRange(1)}>&rarr;</button>
                    <button
                      type="button"
                      className="history-refresh-btn"
                      onClick={() => {
                        setHistoryPeriod('custom');
                        if (!historyDateFrom || !historyDateTo) {
                          const now = new Date();
                          const start = new Date(now.getTime() - 7 * DAY_MS);
                          setHistoryDateFrom(toDateInput(start));
                          setHistoryDateTo(toDateInput(now));
                        }
                        if (token) void loadVendas(token);
                      }}
                    >
                      Atualizar
                    </button>
                    <div className="history-actions history-actions-inline">
                      <button type="button" onClick={exportHistoricoPdf}>Exportar PDF</button>
                      <button type="button" onClick={exportHistoricoExcel}>Exportar Excel</button>
                      {canClearSalesHistory && (
                        <button type="button" className="danger" onClick={() => setShowClearHistoryModal(true)}>
                          Limpar histórico
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel history-table-panel">
                  <div className="table-head history-head">
                    <span>ID venda</span>
                    <span>Cliente</span>
                    <span>Pagamento</span>
                    <span>Status</span>
                    <span>Operador</span>
                    <span>Itens</span>
                    <span>Total</span>
                    <span>Data</span>
                  </div>
                  <div className="table-body history-table-body">
                    {historyPageItems.length === 0 ? (
                      <p className="empty-text">Nenhuma venda encontrada para os filtros selecionados.</p>
                    ) : (
                      historyPageItems.map((item) => (
                        <div className="table-row history-row" key={item.id}>
                          <span><button type="button" className="link-button" onClick={() => setSelectedVenda(item)}>{item.id.slice(0, 8)}</button></span>
                          <span>{item.cliente}</span>
                          <span>{item.pagamento}</span>
                          <span><span className={`status-pill ${item.statusVenda === 'Concluída' ? 'ok' : 'cancel'}`}>{item.statusVenda}</span></span>
                          <span>{item.operador}</span>
                          <span>{item.itensTotal}</span>
                          <span>{money(toNum(item.total))}</span>
                          <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="table-footer">
                    <div className="table-footer-left">
                      <label>Exibir</label>
                      <select value={historyPageSize} onChange={(event) => setHistoryPageSize(Number(event.target.value))}>
                        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                      <span>Página {historyPage}/{historyTotalPages} | {historyFilteredSales.length} registros</span>
                    </div>
                    <div className="pager">
                      <button type="button" onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} disabled={historyPage <= 1}>Anterior</button>
                      <button type="button" onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} disabled={historyPage >= historyTotalPages}>Proxima</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {view === 'impressoras' && <section className="panel config-panel"><h2>Impressoras</h2><p>Configurações de impressão do caixa.</p><label>Nome da impressora</label><input value={printerName} onChange={(event) => setPrinterName(event.target.value)} /><label className="remember-line"><input type="checkbox" checked={autoPrint} onChange={(event) => setAutoPrint(event.target.checked)} /><span>Impressão automática após venda</span></label><div className="actions-row"><button type="button" onClick={() => setStatus('Teste de impressão enviado')}>Testar</button><button type="button" onClick={() => setStatus('Configuração salva')}>Salvar</button></div></section>}
            {view === 'backup' && (
              /* Sessao: backup local do sistema. */
              <section className="panel config-panel">
                <h2>Backup Local</h2>
                <p>Painel para geração e restauração de backups locais.</p>
                <p>Pasta do backup local: {localBackupFolderName}</p>
                <p>Último backup local: {lastBackupAt ? new Date(lastBackupAt).toLocaleString('pt-BR') : 'Nenhum'}</p>
                <div className="actions-row">
                  <button type="button" onClick={gerarBackupLocal}>Gerar backup local</button>
                  <button type="button" onClick={abrirTelaRestaurarBackup}>Restaurar backup local</button>
                </div>
              </section>
            )}
            {view === 'licenca' && (
              <section className="panel config-panel license-panel">
                <div className="license-panel-head">
                  <div>
                    <h2>Licença local</h2>
                    <p>Controle local de bloqueio e renovação. Validade padrão: 40 dias.</p>
                  </div>
                  <button type="button" className="license-soft-btn" onClick={() => void loadLocalLicenseStatus(false)} disabled={localLicenseLoading}>
                    {localLicenseLoading ? 'Atualizando...' : 'Atualizar status'}
                  </button>
                </div>

                {!localLicenseStatus ? (
                  <div className="license-empty-state">
                    <p>Sem status disponível no momento.</p>
                  </div>
                ) : (
                  <div className="license-overview-grid">
                    <article className={`license-kpi ${localLicenseStatus.bloqueado ? 'blocked' : 'active'}`}>
                      <span>Status</span>
                      <strong>{localLicenseStatus.bloqueado ? 'Bloqueada' : 'Ativa'}</strong>
                    </article>
                    <article className={`license-kpi ${localLicenseStatus.aviso ? 'warning' : ''}`}>
                      <span>Dias restantes</span>
                      <strong>{localLicenseStatus.diasRestantes}</strong>
                    </article>
                    <article className="license-kpi">
                      <span>Expiração</span>
                      <strong>{new Date(localLicenseStatus.dataExpiracao).toLocaleDateString('pt-BR')}</strong>
                    </article>
                    <article className="license-kpi">
                      <span>Tentativas inválidas</span>
                      <strong>{localLicenseStatus.tentativasBloqueio}</strong>
                    </article>
                  </div>
                )}

                <div className="license-panel-grid">
                  <article className="license-card">
                    <h3>Renovar licença</h3>
                    <p className="license-card-tip">Use a senha de renovação para liberar mais 40 dias.</p>
                    <label>Senha de renovação</label>
                    <input
                      type="password"
                      value={localLicenseRenewPassword}
                      onChange={(event) => setLocalLicenseRenewPassword(event.target.value)}
                      placeholder="Digite a senha de renovação"
                    />
                    <div className="actions-row license-actions">
                      <button type="button" onClick={() => void renewLocalLicense()} disabled={localLicenseRenewLoading || localLicenseLoading}>
                        {localLicenseRenewLoading ? 'Renovando...' : 'Renovar por mais 40 dias'}
                      </button>
                    </div>
                  </article>

                  <article className="license-card">
                    <h3>Alterar senha de renovação</h3>
                    <p className="license-card-tip">Recomendado após a primeira instalação.</p>
                    <label>Senha atual</label>
                    <input
                      type="password"
                      value={localLicenseCurrentPassword}
                      onChange={(event) => setLocalLicenseCurrentPassword(event.target.value)}
                      placeholder="Informe a senha atual"
                    />
                    <label>Nova senha</label>
                    <input
                      type="password"
                      value={localLicenseNewPassword}
                      onChange={(event) => setLocalLicenseNewPassword(event.target.value)}
                      placeholder="Informe a nova senha"
                    />
                    <div className="actions-row license-actions">
                      <button type="button" onClick={() => void changeLocalLicensePassword()} disabled={localLicensePasswordLoading}>
                        {localLicensePasswordLoading ? 'Atualizando...' : 'Salvar nova senha'}
                      </button>
                    </div>
                  </article>

                  <article className="license-card license-card-wide">
                    <h3>Gerar licença por usuário</h3>
                    <p className="license-card-tip">Selecione um usuário para gerar uma chave de licença dedicada.</p>
                    <label>Usuário</label>
                    <select value={licenseUserId} onChange={(event) => setLicenseUserId(event.target.value)}>
                      <option value="">Selecione um usuário</option>
                      {licenseUserOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome} ({item.email})
                        </option>
                      ))}
                    </select>
                    <div className="license-generate-grid">
                      <div>
                        <label>Plano</label>
                        <select value={licensePlanType} onChange={(event) => setLicensePlanType(event.target.value as LicensePlanType)}>
                          <option value="MONTHLY">Mensal</option>
                          <option value="ANNUAL">Anual</option>
                          <option value="LIFETIME">Vitalício</option>
                        </select>
                      </div>
                      <div>
                        <label>Máximo de dispositivos</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={licenseMaxDevices}
                          onChange={(event) => setLicenseMaxDevices(event.target.value)}
                        />
                      </div>
                      {licensePlanType !== 'LIFETIME' && (
                        <div>
                          <label>Dias de validade</label>
                          <input
                            type="number"
                            min={1}
                            max={3650}
                            value={licenseValidityDays}
                            onChange={(event) => setLicenseValidityDays(event.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="actions-row license-actions">
                      <button type="button" className="license-soft-btn" onClick={() => { if (token) void loadUsuarios(token); }} disabled={licenseCreateLoading}>
                        Atualizar usuários
                      </button>
                      <button type="button" onClick={() => void createLicenseForUser()} disabled={licenseCreateLoading}>
                        {licenseCreateLoading ? 'Gerando...' : 'Gerar licença'}
                      </button>
                    </div>
                    {lastCreatedUserLicense && (
                      <div className="license-created-box">
                        <p><strong>Chave gerada:</strong> {lastCreatedUserLicense.licenseKey}</p>
                        <p><strong>Status:</strong> {lastCreatedUserLicense.status}</p>
                        <p>
                          <strong>Expira em:</strong>{' '}
                          {lastCreatedUserLicense.expiresAt
                            ? new Date(lastCreatedUserLicense.expiresAt).toLocaleString('pt-BR')
                            : 'Sem expiração'}
                        </p>
                      </div>
                    )}
                  </article>
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {/* Sessao: modais e popups globais acionados pela interface. */}
      {showOpenCashModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal open-cash-modal">
            <div className="open-cash-head">
              <h3>
                <FontAwesomeIcon icon={faMoneyBillWave} />
                Abertura de Caixa
              </h3>
              <p>Informe os dados para iniciar o caixa deste turno</p>
            </div>

            <div className="open-cash-fields">
              <label>Descrição</label>
              <input
                value={openCashDescricao}
                onChange={(event) => setOpenCashDescricao(event.target.value)}
                placeholder="Ex: Saldo inicial"
              />

              <label>Valor para iniciar o caixa</label>
              <input
                value={openCashValor}
                onChange={(event) => setOpenCashValor(event.target.value)}
                onBlur={() => setOpenCashValor(moneyField(moneyInput(openCashValor)))}
                placeholder="0,00"
                disabled={openCashSemValor}
              />
              <label className="remember-line">
                <input
                  type="checkbox"
                  checked={openCashSemValor}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setOpenCashSemValor(checked);
                    if (checked) setOpenCashValor('0,00');
                  }}
                />
                <span>Iniciar sem valor</span>
              </label>
              <small className="modal-tip">
                {openCashSemValor
                  ? 'O caixa será aberto com saldo inicial de R$ 0,00.'
                  : 'Informe valor maior que zero para abrir o caixa.'}
              </small>
            </div>

            <div className="cash-modal-actions open-cash-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowOpenCashModal(false);
                  setOpenCashSemValor(false);
                }}
                disabled={openingCashLoading}
              >
                Cancelar
              </button>
              <button type="button" className="primary" onClick={abrirCaixa} disabled={openingCashLoading}>
                {openingCashLoading ? 'Abrindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showFlowModal && <div className="cash-modal-backdrop"><div className="cash-modal"><h3>{showFlowModal === 'SUPRIMENTO' ? 'Suprimento' : 'Sangria'}</h3><label>Descrição</label><input value={flowDescricao} onChange={(event) => setFlowDescricao(event.target.value)} /><label>Valor</label><input value={flowValor} onChange={(event) => setFlowValor(event.target.value)} placeholder="00,00" /><div className="cash-modal-actions"><button type="button" onClick={() => setShowFlowModal(null)}>Cancelar</button><button type="button" onClick={() => confirmarFluxo(showFlowModal)}>Confirmar</button></div></div></div>}
      {showClienteModal && <div className="cash-modal-backdrop"><div className="cash-modal"><h3>Novo Cliente</h3><label>Nome</label><input value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} /><label>Celular</label><input value={clienteCelular} onChange={(event) => setClienteCelular(event.target.value)} /><label>Limite total</label><input value={clienteLimite} onChange={(event) => setClienteLimite(event.target.value)} /><div className="cash-modal-actions"><button type="button" onClick={() => setShowClienteModal(false)}>Cancelar</button><button type="button" onClick={addCliente}>Salvar</button></div></div></div>}
      {showProdutoModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal product-editor-modal">
            <div className="product-editor-head">
              <h3>Cadastrar novo produto</h3>
              <p>Dashboard / <span>Cadastrar novo produto</span></p>
            </div>
            <div className="product-editor-tabs">
              <button type="button" className={produtoFormTab === 'geral' ? 'active' : ''} onClick={() => setProdutoFormTab('geral')}>Geral</button>
              <button type="button" className={produtoFormTab === 'mais' ? 'active' : ''} onClick={() => setProdutoFormTab('mais')}>Mais</button>
            </div>
            {produtoFormTab === 'geral' ? (
              <div className="product-editor-grid product-geral-grid">
                <div className="product-span-2">
                  <label>Nome  *</label>
                  <input value={produtoNome} onChange={(event) => setProdutoNome(event.target.value)} placeholder="Digite o nome do produto" />
                </div>
                <div>
                  <label>Código de barra</label>
                  <input value={produtoCodigo} onChange={(event) => setProdutoCodigo(event.target.value)} placeholder="Insira o código de barra" />
                </div>
                <div>
                  <label>Preço do fardo</label>
                  <input value={produtoPrecoFardo} onChange={(event) => setProdutoPrecoFardo(formatMoneyInput(event.target.value))} inputMode="decimal" placeholder="0,00" />
                </div>
                <div>
                  <label>Quantidade no fardo</label>
                  <input value={produtoQtdFardo} onChange={(event) => setProdutoQtdFardo(event.target.value)} inputMode="numeric" placeholder="0" />
                </div>
                <div>
                  <label>Preço pela margem R$</label>
                  <input value={produtoPrecoSugeridoLabel} readOnly className="product-calc-input" />
                </div>
                <div>
                  <label>Custo por unidade  *</label>
                  <input value={produtoCustoUnidadeLabel} readOnly />
                </div>
                <div>
                  <label>Preço de venda  *</label>
                  <input value={produtoPreco} onChange={(event) => handleProdutoPrecoChange(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Margem de lucro (%)</label>
                  <input value={produtoMargemManual} onChange={(event) => handleProdutoMargemManualChange(event.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <label>Estoque  *</label>
                  <input value={produtoEstoque} onChange={(event) => setProdutoEstoque(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Estoque mínimo</label>
                  <input value={produtoEstoqueMinimo} onChange={(event) => setProdutoEstoqueMinimo(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Margem de lucro (R$)</label>
                  <input value={produtoMargemReaisLabel} readOnly className="product-calc-input" />
                </div>
              </div>
            ) : (
              <div className="product-editor-grid">
                <div>
                  <label>Data de validade</label>
                  <input type="date" value={produtoValidade} onChange={(event) => setProdutoValidade(event.target.value)} />
                </div>
                <div>
                  <label>Categoria do produto</label>
                  <div className="product-select-add">
                    <select value={produtoCategoria} onChange={(event) => setProdutoCategoria(event.target.value)}>
                      {produtoCategorias.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button type="button" className="product-add-btn" onClick={() => setShowAddCategoriaModal(true)}>+</button>
                  </div>
                </div>
                <div>
                  <label>Descrição do produto</label>
                  <input value={produtoDescricao} onChange={(event) => setProdutoDescricao(event.target.value)} placeholder="Informe uma descrição" />
                </div>
                <div>
                  <label>Marca do produto</label>
                  <div className="product-select-add">
                    <select value={produtoMarca} onChange={(event) => setProdutoMarca(event.target.value)}>
                      {produtoMarcas.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button type="button" className="product-add-btn" onClick={() => setShowAddMarcaModal(true)}>+</button>
                  </div>
                </div>
                <div>
                  <label>Lote do produto</label>
                  <input value={produtoLote} onChange={(event) => setProdutoLote(event.target.value)} placeholder="Informe o número do lote" />
                </div>
                <div>
                  <label>Fornecedor do produto</label>
                  <input value={produtoFornecedor} onChange={(event) => setProdutoFornecedor(event.target.value)} placeholder="Informe o nome do fornecedor" />
                </div>
              </div>
            )}
            <div className="cash-modal-actions">
              <button type="button" onClick={() => { setShowProdutoModal(false); resetProdutoFormFields(); }}>Cancelar</button>
              <button type="button" onClick={() => void adicionarProdutoApi()}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {showEditProdutoModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal product-editor-modal">
            <div className="product-editor-head">
              <h3>Editar produto</h3>
              <p>Dashboard / <span>Editar produto</span></p>
            </div>
            <div className="product-editor-tabs">
              <button type="button" className={produtoFormTab === 'geral' ? 'active' : ''} onClick={() => setProdutoFormTab('geral')}>Geral</button>
              <button type="button" className={produtoFormTab === 'mais' ? 'active' : ''} onClick={() => setProdutoFormTab('mais')}>Mais</button>
            </div>
            {produtoFormTab === 'geral' ? (
              <div className="product-editor-grid product-geral-grid">
                <div className="product-span-2">
                  <label>Nome  *</label>
                  <input value={produtoNome} onChange={(event) => setProdutoNome(event.target.value)} />
                </div>
                <div>
                  <label>Código de barra</label>
                  <input value={produtoCodigo} onChange={(event) => setProdutoCodigo(event.target.value)} placeholder="Insira o código de barra" />
                </div>
                <div>
                  <label>Preço do fardo</label>
                  <input value={produtoPrecoFardo} onChange={(event) => setProdutoPrecoFardo(formatMoneyInput(event.target.value))} inputMode="decimal" placeholder="0,00" />
                </div>
                <div>
                  <label>Quantidade no fardo</label>
                  <input value={produtoQtdFardo} onChange={(event) => setProdutoQtdFardo(event.target.value)} inputMode="numeric" placeholder="0" />
                </div>
                <div>
                  <label>Preço pela margem R$</label>
                  <input value={produtoPrecoSugeridoLabel} readOnly className="product-calc-input" />
                </div>
                <div>
                  <label>Custo por unidade  *</label>
                  <input value={produtoCustoUnidadeLabel} readOnly />
                </div>
                <div>
                  <label>Preço de venda  *</label>
                  <input value={produtoPreco} onChange={(event) => handleProdutoPrecoChange(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Margem de lucro (%)</label>
                  <input value={produtoMargemManual} onChange={(event) => handleProdutoMargemManualChange(event.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <label>Estoque  *</label>
                  <input value={produtoEstoque} onChange={(event) => setProdutoEstoque(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Estoque mínimo</label>
                  <input value={produtoEstoqueMinimo} onChange={(event) => setProdutoEstoqueMinimo(event.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label>Margem de lucro (R$)</label>
                  <input value={produtoMargemReaisLabel} readOnly className="product-calc-input" />
                </div>
              </div>
            ) : (
              <div className="product-editor-grid">
                <div>
                  <label>Data de validade</label>
                  <input type="date" value={produtoValidade} onChange={(event) => setProdutoValidade(event.target.value)} />
                </div>
                <div>
                  <label>Categoria do produto</label>
                  <div className="product-select-add">
                    <select value={produtoCategoria} onChange={(event) => setProdutoCategoria(event.target.value)}>
                      {produtoCategorias.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button type="button" className="product-add-btn" onClick={() => setShowAddCategoriaModal(true)}>+</button>
                  </div>
                </div>
                <div>
                  <label>Descrição do produto</label>
                  <input value={produtoDescricao} onChange={(event) => setProdutoDescricao(event.target.value)} placeholder="Informe uma descrição" />
                </div>
                <div>
                  <label>Marca do produto</label>
                  <div className="product-select-add">
                    <select value={produtoMarca} onChange={(event) => setProdutoMarca(event.target.value)}>
                      {produtoMarcas.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button type="button" className="product-add-btn" onClick={() => setShowAddMarcaModal(true)}>+</button>
                  </div>
                </div>
                <div>
                  <label>Lote do produto</label>
                  <input value={produtoLote} onChange={(event) => setProdutoLote(event.target.value)} placeholder="Informe o número do lote" />
                </div>
                <div>
                  <label>Fornecedor do produto</label>
                  <input value={produtoFornecedor} onChange={(event) => setProdutoFornecedor(event.target.value)} placeholder="Informe o nome do fornecedor" />
                </div>
              </div>
            )}
            <div className="cash-modal-actions">
              <button type="button" onClick={() => { setShowEditProdutoModal(false); resetProdutoFormFields(); }}>Cancelar</button>
              <button type="button" onClick={() => void atualizarProdutoApi()}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {showAddMarcaModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faUser} /> Adicionar marca</h3>
            </div>
            <hr className="meta-modal-divider" />
            <label>Nome da marca *</label>
            <input value={novaMarca} onChange={(event) => setNovaMarca(event.target.value)} placeholder="Nome da marca" />
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={() => { setShowAddMarcaModal(false); setNovaMarca(''); }}>Cancelar</button>
              <button type="button" onClick={confirmarNovaMarca}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {showAddCategoriaModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faTag} /> Adicionar categoria</h3>
            </div>
            <hr className="meta-modal-divider" />
            <label>Nome da categoria *</label>
            <input value={novaCategoria} onChange={(event) => setNovaCategoria(event.target.value)} placeholder="Nome da categoria" />
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={() => { setShowAddCategoriaModal(false); setNovaCategoria(''); }}>Cancelar</button>
              <button type="button" onClick={confirmarNovaCategoria}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {showPrintProdutoModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal print-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faPrint} /> Imprimir preço</h3>
            </div>
            <hr className="meta-modal-divider" />
            <p className="print-modal-text">Deseja imprimir o preço do produto?</p>
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={() => { setShowPrintProdutoModal(false); setProdutoToPrint(null); }}>Cancelar</button>
              <button type="button" onClick={confirmarImpressaoProduto}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {showClearHistoryModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal danger-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faTrash} /> Limpar histórico de vendas</h3>
            </div>
            <hr className="meta-modal-divider" />
            <p className="history-clear-text">Deseja excluir todo o histórico de vendas? Esta ação não pode ser desfeita.</p>
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={() => setShowClearHistoryModal(false)} disabled={clearingHistoryLoading}>Cancelar</button>
              <button type="button" className="danger" onClick={() => void limparHistoricoVendasApi()} disabled={clearingHistoryLoading}>
                {clearingHistoryLoading ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdminDeleteModal && pendingAdminDelete && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal danger-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faTrash} /> Excluir {pendingAdminDelete.kind === 'usuario' ? 'usuário' : 'fornecedor'}</h3>
            </div>
            <hr className="meta-modal-divider" />
            <p className="history-clear-text">
              Deseja excluir {pendingAdminDelete.kind === 'usuario' ? 'o usuário' : 'o fornecedor'} "{pendingAdminDelete.label}" do banco de dados?
            </p>
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={closeAdminDeleteModal} disabled={loading}>Cancelar</button>
              <button type="button" className="danger" onClick={() => void confirmAdminDelete()} disabled={loading}>
                {loading ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteCaixaModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal danger-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faTrash} /> Excluir caixa</h3>
            </div>
            <hr className="meta-modal-divider" />
            <p className="history-clear-text">
              Deseja excluir o Caixa {deleteCaixaNumero}? {deleteCaixaItens > 0 ? `Os ${deleteCaixaItens} item(ns) deste caixa serão perdidos.` : ''}
            </p>
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={cancelRemoveActiveVendaCaixa}>Cancelar</button>
              <button type="button" className="danger" onClick={confirmRemoveActiveVendaCaixa}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {showLogoutModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal meta-modal danger-modal">
            <div className="meta-modal-head">
              <h3><FontAwesomeIcon icon={faArrowRightFromBracket} /> Sair da conta</h3>
            </div>
            <hr className="meta-modal-divider" />
            <p className="history-clear-text">Deseja realmente sair da conta?</p>
            <hr className="meta-modal-divider" />
            <div className="cash-modal-actions">
              <button type="button" onClick={cancelLogout}>Cancelar</button>
              <button type="button" className="danger" onClick={() => void performLogout()}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {showRestoreBackupModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal">
            <h3>Selecionar Backup</h3>
            <p>Escolha o backup da pasta <strong>{localBackupFolderName}</strong> para restaurar.</p>
            {restoreBackupCandidates.length === 0 ? (
              <p>Nenhum backup disponível para restauração.</p>
            ) : (
              <div className="table-body">
                {restoreBackupCandidates.map((item, index) => (
                  <div className="table-row history-row" key={`${item.createdAt}-${index}`}>
                    <span>{backupFileNameFromDate(item.createdAt, index)}</span>
                    <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                    <span><button type="button" onClick={() => restaurarBackupLocal(item)}>Restaurar</button></span>
                  </div>
                ))}
              </div>
            )}
            <div className="cash-modal-actions">
              <button type="button" onClick={() => setShowRestoreBackupModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal payment-modal payment-modal-v2">
            <div className="payment-v2-head">
              <h3>Finalizar venda</h3>
              <p>Dashboard / <span>Finalizar venda</span></p>
            </div>
            <div className="payment-v2-layout">
              <div className="payment-v2-main">
                <div className="payment-v2-cards">
                  <article><span>Qtd de itens</span><strong>{quantidadeItensVenda}</strong></article>
                  <article><span>Total com desconto</span><strong>{moneyField(totalFinalVenda)}</strong></article>
                  <article><span>Total da venda</span><strong>{moneyField(totalFinalVenda)}</strong></article>
                </div>

                <div className="payment-v2-form-grid">
                  <div>
                    <label>Valor recebido</label>
                    <input
                      value={paymentMainLine.valorRecebido}
                      onChange={(event) => updateMainPaymentLine({ valorRecebido: formatCurrencyInput(event.target.value) })}
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label>Desconto</label>
                    <input value={saleDiscount} onChange={(event) => setSaleDiscount(formatMoneyInput(event.target.value))} inputMode="decimal" placeholder="0,00" />
                  </div>
                  <div>
                    <label>Forma de pagamento</label>
                    <select
                      value={paymentMainLine.tipo}
                      onChange={(event) => {
                        const tipo = event.target.value as PaymentType;
                        updateMainPaymentLine({
                          tipo,
                          confirmado: true,
                          parcelas: tipo === 'CARTAO_CREDITO' ? paymentMainLine.parcelas : 1,
                          valorRecebido: tipo === 'DINHEIRO' ? paymentMainLine.valorRecebido : paymentMainLine.valor,
                        });
                      }}
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="CARTAO_CREDITO">Cartão crédito</option>
                      <option value="CARTAO_DEBITO">Cartão débito</option>
                    </select>
                  </div>
                  <div className="payment-v2-inline-3">
                    <div>
                      <label>Parcela</label>
                      <select
                        value={paymentMainLine.parcelas}
                        disabled={paymentMainLine.tipo !== 'CARTAO_CREDITO'}
                        onChange={(event) => updateMainPaymentLine({ parcelas: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => <option key={p} value={p}>{p}x</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Parcela(R$)</label>
                      <input value={`R$ ${parcelaValorLabel}`} readOnly />
                    </div>
                  </div>
                  <div>
                    <label>Nome do cliente</label>
                    <input value={saleCliente} onChange={(event) => setSaleCliente(event.target.value)} placeholder="Cliente avulso" />
                  </div>
                  <div>
                    <label>Data pagamento</label>
                    <input type="date" value={salePaymentDate} onChange={(event) => setSalePaymentDate(event.target.value)} />
                  </div>
                </div>
              </div>

              <aside className="payment-v2-side">
                <article className="payment-v2-troco">
                  <span>TROCO:</span>
                  <strong>{moneyField(trocoVenda)}</strong>
                </article>
                <button type="button" className="primary payment-v2-final-btn" onClick={() => void confirmarPagamentoVenda()} disabled={loading}>
                  {loading ? 'Processando...' : 'Finalizar venda'}
                </button>
              </aside>
            </div>

            <div className="payment-v2-actions">
              <button type="button" onClick={() => void confirmarPagamentoVenda()} disabled={loading}>
                {loading ? 'Processando...' : 'Finalizar'}
              </button>
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={loading}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {selectedVenda && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal">
            <h3>Detalhes da venda</h3>
            <p><strong>ID:</strong> {selectedVenda.id}</p>
            <p><strong>Cliente:</strong> {selectedVenda.cliente}</p>
            <p><strong>Pagamento:</strong> {selectedVenda.pagamento}</p>
            <p><strong>Status:</strong> {selectedVenda.statusVenda}</p>
            <p><strong>Operador:</strong> {selectedVenda.operador}</p>
            <p><strong>Itens:</strong> {selectedVenda.itensTotal}</p>
            <p><strong>Total:</strong> {money(toNum(selectedVenda.total))}</p>
            <p><strong>Data:</strong> {new Date(selectedVenda.createdAt).toLocaleString('pt-BR')}</p>
            <div className="cash-modal-actions">
              <button type="button" onClick={() => setSelectedVenda(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {showAccountModal && (
        <div className="cash-modal-backdrop">
          <div className="cash-modal account-modal">
            <h3>Configurações da conta</h3>
            <div className="account-settings-grid">
              <label>Página inicial após login</label>
              <select value={accountStartView} onChange={(event) => setAccountStartView(event.target.value as AccountStartView)}>
                {isAdmin && <option value="dashboard">Dashboard</option>}
                <option value="venda">Realizar venda</option>
                <option value="caixa">Gerenciar caixa</option>
                <option value="historico">Histórico de vendas</option>
              </select>

              <label>Itens por página no histórico</label>
              <select
                value={String(accountHistoryPageSize)}
                onChange={(event) => setAccountHistoryPageSize(Number(event.target.value) as 10 | 25 | 50 | 100)}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>

              <label className="remember-line">
                <input type="checkbox" checked={accountConfirmLogout} onChange={(event) => setAccountConfirmLogout(event.target.checked)} />
                <span>Confirmar antes de sair da conta</span>
              </label>

              <label className="remember-line">
                <input
                  type="checkbox"
                  checked={accountCollapsedMenu}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setAccountCollapsedMenu(checked);
                    setMenuOpen(!checked);
                  }}
                />
                <span>Abrir sistema com menu recolhido</span>
              </label>
            </div>

            <hr className="config-divider" />
            <p className="account-password-tip">Troca de senha (opcional)</p>
            <label>Senha atual</label>
            <input type="password" value={currentSenha} onChange={(event) => setCurrentSenha(event.target.value)} />
            <label>Nova senha</label>
            <input type="password" value={newSenha} onChange={(event) => setNewSenha(event.target.value)} />
            {isAdmin && (
              <>
                <hr className="config-divider" />
                <p className="account-password-tip">Senha de renovação da licença local</p>
                <label>Senha atual da renovação</label>
                <input
                  type="password"
                  value={localLicenseCurrentPassword}
                  onChange={(event) => setLocalLicenseCurrentPassword(event.target.value)}
                />
                <label>Nova senha de renovação</label>
                <input
                  type="password"
                  value={localLicenseNewPassword}
                  onChange={(event) => setLocalLicenseNewPassword(event.target.value)}
                />
                <div className="cash-modal-actions">
                  <button type="button" onClick={() => void changeLocalLicensePassword()} disabled={localLicensePasswordLoading}>
                    {localLicensePasswordLoading ? 'Atualizando...' : 'Alterar senha da licença'}
                  </button>
                </div>
              </>
            )}

            <div className="cash-modal-actions">
              <button type="button" onClick={() => setShowAccountModal(false)}>Cancelar</button>
              <button type="button" onClick={() => void saveAccountSettings()} disabled={loading}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {token && localLicenseBlocked && (
        <div className="cash-modal-backdrop local-license-backdrop">
          <div className="cash-modal local-license-modal">
            {renderLocalLicenseRenewContent('blocked')}
          </div>
        </div>
      )}
      {(status || error) && <footer className="status-bar">{status && <p className="ok">{status}</p>}{error && <p className="fail">{error}</p>}</footer>}
    </div>
  );
}

export default App;
