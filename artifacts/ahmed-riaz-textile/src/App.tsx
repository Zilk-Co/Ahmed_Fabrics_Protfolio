import { useEffect, useState, useRef, useContext, createContext, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight,
  Database, Download, Eye, EyeOff, Factory, FileText, Images, LayoutDashboard, Loader2, LogOut, Mail, MapPin,
  Menu, MessageCircle, Pencil, Phone, Plus, Save, Settings, ShieldCheck,
  SlidersHorizontal, Star, Trash2, Upload, X, Zap, Search, Filter,
  Copy, ExternalLink, Globe, Clock, Tag, Layers, GripVertical, CheckSquare, Square,
  ImagePlus, Link as LinkIcon, Type, AlignLeft, Hash, BarChart3, TrendingUp,
  CircleDot, ChevronDown,
} from 'lucide-react';
import {
  ContentCollection, type ContentInput, type ContentRecord, type ContentUpdate,
  type SiteContent, type SiteSettingsUpdate,
} from '@workspace/api-client-react';
import {
  getGetAdminDashboardQueryKey, getGetAdminSessionQueryKey, getGetSiteQueryKey,
  getListAdminContentQueryKey, useCreateAdminContent,
  useDeleteAdminContent, useGetAdminDashboard, useGetAdminSession, useGetSite,
  useHealthCheck, useListAdminContent, useLoginAdmin, useLogoutAdmin,
  useSeedSampleData, useUpdateAdminContent, useUpdateAdminSite,
  useGetCategories, useBulkContentAction, useDuplicateContent, useUpdateAdminStats,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Router as WouterRouter, Link, Switch, useLocation, useParams } from 'wouter';
import NotFound from '@/pages/not-found';
import './index.css';

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// Page text hooks for inline editing
function usePageText(page: string) {
  return useQuery({
    queryKey: ['pageText', page],
    queryFn: async () => {
      const res = await fetch(`/api/page-text?page=${encodeURIComponent(page)}`);
      if (!res.ok) return {} as Record<string, { value: string; color?: string }>;
      return res.json() as Promise<Record<string, { value: string; color?: string }>>;
    },
    staleTime: 0,
  });
}

function useSavePageText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { page: string; key: string; value: string; color?: string }) => {
      const res = await fetch('/api/admin/page-text', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['pageText', variables.page] });
    },
  });
}

const EDITOR_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Primary', value: 'text-primary' },
  { label: 'Secondary', value: 'text-secondary' },
  { label: 'Muted', value: 'text-muted-foreground' },
  { label: 'White', value: 'text-white' },
  { label: 'Black', value: 'text-black' },
  { label: 'Red', value: 'text-red-500' },
  { label: 'Blue', value: 'text-blue-500' },
  { label: 'Green', value: 'text-green-600' },
  { label: 'Teal', value: 'text-teal-900' },
];

const EDITOR_FONT_SIZES = [
  { label: 'XS', value: '10px' },
  { label: 'SM', value: '12px' },
  { label: 'Base', value: '14px' },
  { label: 'MD', value: '16px' },
  { label: 'LG', value: '18px' },
  { label: 'XL', value: '20px' },
  { label: '2XL', value: '24px' },
];

function EditableText({ page, k, children, className = '', as: Tag = 'span' }: {
  page: string; k: string; children: ReactNode; className?: string; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
}) {
  const editorMode = useContext(EditorModeContext);
  const pageText = useContext(PageTextContext);
  const saveText = useSavePageText();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const saved = pageText?.[k];
  const text = saved?.value ?? (typeof children === 'string' ? children : '');
  const colorClass = saved?.color || '';

  if (!editorMode) return <Tag className={`${className} ${colorClass}`.trim()}>{children}</Tag>;

  const startEdit = () => { setDraft(text); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft(''); };
  const saveEdit = () => {
    if (draft !== text) {
      saveText.mutate({ page, key: k, value: draft, color: saved?.color || undefined });
    }
    setShowSaved(true);
    setTimeout(() => { setShowSaved(false); setEditing(false); }, 1200);
  };
  const setColor = (c: string) => {
    saveText.mutate({ page, key: k, value: text, color: c || undefined });
    setShowColors(false);
  };
  const removeText = () => {
    saveText.mutate({ page, key: k, value: text, color: undefined });
    setEditing(false);
  };

  return <span className="relative inline-block group"><Tag
    ref={ref as never}
    className={`${className} ${colorClass} outline outline-2 outline-offset-2 outline-dashed outline-secondary/50 cursor-pointer hover:outline-secondary transition-all`.trim()}
    onClick={startEdit}
    contentEditable={editing}
    suppressContentEditableWarning
    onBlur={(e) => { setDraft(e.currentTarget.textContent || ''); }}
    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }}
  >{editing ? draft : text}</Tag>
  {editing && <span className="absolute -top-8 left-0 z-50 flex gap-1 rounded border border-border bg-white p-1 shadow-lg">
    <button type="button" onMouseDown={(e) => { e.preventDefault(); saveEdit(); }} className={`rounded px-2 py-0.5 text-[9px] font-bold ${showSaved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground'}`}>{showSaved ? 'Saved!' : 'Save'}</button>
    <button type="button" onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }} className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">Cancel</button>
    <button type="button" onMouseDown={(e) => { e.preventDefault(); removeText(); }} className="rounded bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">Remove</button>
    <span className="relative">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowColors(!showColors); }} className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">Color</button>
      {showColors && <span className="absolute top-7 left-0 z-50 flex flex-wrap gap-1 rounded border border-border bg-white p-1 shadow-lg w-32">
        {EDITOR_COLORS.map(c => <button key={c.value} type="button" onMouseDown={(e) => { e.preventDefault(); setColor(c.value); }} className={`h-5 w-5 rounded-sm border text-[7px] font-bold ${c.value || 'bg-background text-foreground'} ${saved?.color === c.value ? 'ring-2 ring-primary' : ''}`}>{c.label[0]}</button>)}
      </span>}
    </span>
  </span>}
  </span>;
}

function EditorOverlay() {
  const editorMode = useContext(EditorModeContext);
  const saveText = useSavePageText();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getCurrentColor = (el: HTMLElement): string => {
    for (const c of EDITOR_COLORS) {
      if (c.value && el.classList.contains(c.value)) return c.value;
    }
    return '';
  };

  const getCurrentSize = (el: HTMLElement): string => {
    return el.style.fontSize || '';
  };

  useEffect(() => {
    if (!editorMode) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('.editor-toolbar') || el.closest('[contenteditable]') || el.closest('[data-editor-exit]') || el.closest('button[data-no-editor]')) return;
      const textEl = el.closest('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, div') as HTMLElement;
      if (textEl && textEl.textContent?.trim() && !textEl.querySelector('h1, h2, h3, h4, h5, h6, p, span, a, li')) {
        e.preventDefault();
        e.stopPropagation();
        setTarget(textEl);
        setDraft(textEl.textContent || '');
        setOriginalText(textEl.textContent || '');
        setEditing(true);
        setSaved(false);
        setShowColors(false);
        setShowSizes(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [editorMode]);

  if (!editorMode || !target || !editing) return null;

  const page = window.location.pathname.replace(/\?.*/, '').replace(/^\//, '') || 'home';
  const key = `text_${target.textContent?.slice(0, 40).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || Date.now()}`;
  const currentColor = getCurrentColor(target);
  const currentSize = getCurrentSize(target);

  const save = () => {
    if (draft !== target.textContent) {
      saveText.mutate({ page, key, value: draft });
      target.textContent = draft;
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); setTarget(null); }, 1200);
  };

  const cancelEdit = () => {
    if (target && originalText) target.textContent = originalText;
    setEditing(false);
    setTarget(null);
  };

  const setColor = (c: string) => {
    if (target) {
      EDITOR_COLORS.forEach(co => { if (co.value) target.classList.remove(co.value); });
      if (c) target.classList.add(c);
      saveText.mutate({ page, key: `${key}_color`, value: c || 'default' });
    }
    setShowColors(false);
  };

  const setFontSize = (s: string) => {
    if (target) {
      target.style.fontSize = s || '';
      saveText.mutate({ page, key: `${key}_size`, value: s || 'default' });
    }
    setShowSizes(false);
  };

  const toolbarTop = Math.max(10, target.getBoundingClientRect().top - 52);
  const toolbarLeft = Math.min(target.getBoundingClientRect().left, window.innerWidth - 400);

  return <div ref={overlayRef} className="editor-toolbar fixed z-[70] flex flex-wrap items-center gap-1 rounded border border-border bg-white p-1.5 shadow-lg" style={{ top: toolbarTop, left: toolbarLeft }}>
    <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit(); }} className="w-44 border-b border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary" autoFocus />
    <button type="button" onMouseDown={e => { e.preventDefault(); save(); }} className={`rounded px-2 py-1 text-[9px] font-bold ${saved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground'}`}>{saved ? 'Saved!' : 'Save'}</button>
    <button type="button" onMouseDown={e => { e.preventDefault(); cancelEdit(); }} className="rounded bg-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">Cancel</button>
    <span className="relative">
      <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(!showColors); setShowSizes(false); }} className={`rounded px-2 py-1 text-[9px] font-bold ${showColors ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Color</button>
      {showColors && <span className="absolute top-7 left-0 z-50 flex flex-wrap gap-1 rounded border border-border bg-white p-1 shadow-lg w-36">
        {EDITOR_COLORS.map(c => <button key={c.value} type="button" onMouseDown={e => { e.preventDefault(); setColor(c.value); }} className={`h-6 w-6 rounded-sm border text-[8px] font-bold ${c.value || 'bg-background text-foreground'} ${currentColor === c.value ? 'ring-2 ring-primary ring-offset-1' : ''}`}>{c.label[0]}</button>)}
      </span>}
    </span>
    <span className="relative">
      <button type="button" onMouseDown={e => { e.preventDefault(); setShowSizes(!showSizes); setShowColors(false); }} className={`rounded px-2 py-1 text-[9px] font-bold ${showSizes ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Size</button>
      {showSizes && <span className="absolute top-7 left-0 z-50 flex flex-wrap gap-1 rounded border border-border bg-white p-1 shadow-lg w-36">
        {EDITOR_FONT_SIZES.map(s => <button key={s.value} type="button" onMouseDown={e => { e.preventDefault(); setFontSize(s.value); }} className={`rounded border border-border px-2 py-1 text-[9px] font-bold hover:bg-muted ${currentSize === s.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{s.label}</button>)}
      </span>}
    </span>
  </div>;
}

const EditorModeContext = createContext(false);
const PageTextContext = createContext<Record<string, { value: string; color?: string }> | null>(null);

const queryClient = new QueryClient();
const collections = Object.values(ContentCollection);
const navItems = [
  { href: '/', label: 'Home' }, { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Services' }, { href: '/products', label: 'Our Products & Design' },
  { href: '/excellence', label: 'Our Excellence' }, { href: '/contact', label: 'Contact Us' },
];
const fallbackSettings = {
  brandName: 'Riaz Fabrics', location: 'Baldia, Karachi',
  phone: '+92 21 3258 2140', whatsapp: '+92 300 825 4210', email: 'production@ahmedriaztextile.com',
  officeAddress: 'Plot 18, Sector 7-A, Baldia Town, Karachi', factoryAddress: 'Baldia Industrial Area, Karachi, Pakistan',
  businessHours: 'Monday to Saturday, 9:00 am to 6:00 pm', whatsappMessage: 'Hello Riaz Fabrics, I would like to discuss a production requirement.',
  heroImage: '/factory-hero.jpg', heroVideo: null,
  aboutHeroImage: '/factory-hero.jpg', servicesHeroImage: '/factory-hero.jpg',
  productsHeroImage: '/factory-hero.jpg', designsHeroImage: '/fabric-detail.jpg',
  excellenceHeroImage: '/factory-hero.jpg', contactHeroImage: '/factory-hero.jpg',
  founderName: 'Riaz Ahmed', founderTitle: 'Founder & Managing Director',
  founderQuote: 'We started with one machine and a clear idea: make textiles that actually work for the people who use them.',
  founderImage: '/founder.jpg',
};
const fallbackStats = [
  { value: '99+', label: 'Machines', displayOrder: 1 },
  { value: '55+', label: 'Workers', displayOrder: 2 },
  { value: '46+', label: 'Years', displayOrder: 3 },
  { value: 'B2B', label: 'Custom Production', displayOrder: 4 },
];
const STAT_DISPLAY: Record<string, string> = {
  'Machines': 'machines on the floor',
  'Workers': 'workers supporting production',
  'Years': 'years of experience',
  'Custom Production': 'custom textile production',
};
function statLabel(stat: { value: string; label: string }) {
  return STAT_DISPLAY[stat.label] || stat.label.toLowerCase();
}
const fallbackProducts = [
  { id: 101, collection: 'products' as const, slug: 'cotton-cloth', title: 'Cotton Fabrics', shortDescription: 'Cotton cloth manufactured for custom textile requirements.', description: 'Cotton fabric for brands, local businesses and wholesale customers. Material, quantity and finish are discussed before production.', category: 'Fabric', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg', '/hero-textile.jpg'], video: null, published: true, featured: true, displayOrder: 1, meta: { application: 'Custom fabric requirements' } },
  { id: 102, collection: 'products' as const, slug: 'dupatta-textiles', title: 'Dupattas', shortDescription: 'Textile production for dupattas and related fabric requirements.', description: 'Fabric and textile work suitable for dupatta production, shaped around material, pattern, quantity and finishing needs.', category: 'Textile product', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg'], video: null, published: true, featured: true, displayOrder: 2, meta: { application: 'Dupatta production' } },
  { id: 103, collection: 'products' as const, slug: 'womens-headwear-material', title: "Women's Headwear", shortDescription: 'Textile materials for women’s headwear and coverings.', description: 'Materials and fabric work for women’s headwear and related textile applications. Requirements are confirmed before production.', category: 'Textile product', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg'], video: null, published: true, featured: false, displayOrder: 3, meta: { application: 'Headwear textile' } },
  { id: 104, collection: 'products' as const, slug: 'custom-frock-textile', title: 'Frock Textile Work', shortDescription: 'Fabric materials used for frocks and related garments.', description: 'A product category for customers sourcing textile materials for frock-related work. Share the quantity and fabric direction to begin.', category: 'Textile product', image: '/hero-textile.jpg', images: ['/hero-textile.jpg'], video: null, published: true, featured: false, displayOrder: 4, meta: { application: 'Frock textile' } },
];
const fallbackDesigns = [
  { id: 201, collection: 'designs' as const, slug: 'woven-sage-grid', title: 'Woven Sage Grid', shortDescription: 'A restrained woven arrangement with a soft, structured finish.', description: 'A repeatable textile design direction that can be adapted around a customer’s material and production requirements.', category: 'Woven design', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg', '/hero-textile.jpg'], video: null, published: true, featured: true, displayOrder: 1, meta: { note: 'Replace with verified factory work' } },
  { id: 202, collection: 'designs' as const, slug: 'sandline-finish', title: 'Sandline Finish', shortDescription: 'Warm neutral textile work with a clean, tactile surface.', description: 'A sample direction for surface and finishing work across fabric applications.', category: 'Surface finishing', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg'], video: null, published: true, featured: true, displayOrder: 2, meta: { note: 'Replace with verified factory work' } },
];
const fallbackServices = [
  { id: 301, collection: 'services' as const, slug: 'bulk-production', title: 'Custom production', shortDescription: 'From approved sample to packed roll, with one accountable production conversation.', description: 'We plan greige, dyeing, finishing and packing around your order rather than selling a fixed catalogue. Lead times and minimums are discussed openly at the start.', category: 'Production', image: '', images: [], video: null, published: true, featured: true, displayOrder: 1, meta: {} },
  { id: 302, collection: 'services' as const, slug: 'sampling-and-development', title: 'Sampling & development', shortDescription: 'Make the first metre useful before committing to the full run.', description: 'Our team works through hand-feel, construction, colour and finish with practical feedback from the factory floor.', category: 'Development', image: '', images: [], video: null, published: true, featured: true, displayOrder: 2, meta: {} },
  { id: 303, collection: 'services' as const, slug: 'quality-and-packing', title: 'Quality & packing', shortDescription: 'Checks that protect the shipment, not paperwork for its own sake.', description: 'We inspect against the approved standard, record issues early and pack to the handling requirements of your destination.', category: 'Assurance', image: '', images: [], video: null, published: true, featured: false, displayOrder: 3, meta: {} },
];
const fallbackMachines = [
  { id: 501, collection: 'machinery' as const, slug: 'plain-power-loom', title: 'Plain Power Loom', shortDescription: 'A dependable plain-weave loom for high-volume fabric production.', description: 'The plain power loom is the workhorse of the weaving section, producing plain-weave fabric at scale with reliable, consistent output.', category: 'Weaving', image: '/hero-textile.jpg', images: ['/hero-textile.jpg', '/fabric-detail_2.jpg'], video: null, published: true, featured: true, displayOrder: 1, meta: { application: 'High-volume production of plain-weave fabric for garments, home textiles and lining cloth.' } },
  { id: 502, collection: 'machinery' as const, slug: 'dobby-power-loom', title: 'Dobby Power Loom', shortDescription: 'A versatile loom for patterned, webbed and dobby designs.', description: 'The dobby power loom adds pattern capability to the weaving floor, creating webbed, textured and dobby woven designs.', category: 'Design / Weaving', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg', '/hero-textile.jpg'], video: null, published: true, featured: true, displayOrder: 2, meta: { application: 'Weaving webbed, dobby and patterned fabric for decorative and technical textile applications.' } },
  { id: 503, collection: 'machinery' as const, slug: 'water-jet-loom', title: 'Water Jet Loom', shortDescription: 'A high-speed loom using water jets for dense, fine fabric.', description: 'The water jet loom uses a high-pressure water jet to carry the weft yarn across the warp, producing smooth, dense fabric at very high speed.', category: 'Weaving', image: '/hero-textile.jpg', images: ['/hero-textile.jpg', '/fabric-detail_2.jpg'], video: null, published: true, featured: true, displayOrder: 3, meta: { application: 'High-speed weaving of fine, dense and synthetic fabrics for apparel and technical uses.' } },
  { id: 504, collection: 'machinery' as const, slug: 'press-and-repair-machines', title: 'Press & Repair Machines', shortDescription: 'Machinery for pressing, finishing and repair work on the floor.', description: 'The press and repair section handles finishing and maintenance across the production floor.', category: 'Finishing', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg', '/hero-textile.jpg'], video: null, published: true, featured: true, displayOrder: 4, meta: { application: 'Pressing and finishing fabric, plus repair and maintenance support across the factory floor.' } },
  { id: 505, collection: 'machinery' as const, slug: 'warping-machine', title: 'Warping Machine', shortDescription: 'Prepares warp yarns ready for the weaving process.', description: 'The warping machine winds warp yarns from cones onto a beam in carefully controlled tension.', category: 'Preparation', image: '/hero-textile.jpg', images: ['/hero-textile.jpg'], video: null, published: true, featured: false, displayOrder: 5, meta: { application: 'Preparing warp beams for the weaving section.' } },
  { id: 506, collection: 'machinery' as const, slug: 'sizing-machine', title: 'Sizing Machine', shortDescription: 'Coats warp yarns for strength before weaving.', description: 'The sizing machine applies a protective coating to warp yarns, giving them the strength needed for weaving.', category: 'Preparation', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg'], video: null, published: true, featured: false, displayOrder: 6, meta: { application: 'Strengthening warp yarns before weaving.' } },
  { id: 507, collection: 'machinery' as const, slug: 'dyeing-unit', title: 'Dyeing Unit', shortDescription: 'Adds consistent colour to woven fabric.', description: 'The dyeing unit applies colour to fabric in controlled batches.', category: 'Processing', image: '/hero-textile.jpg', images: ['/hero-textile.jpg'], video: null, published: true, featured: false, displayOrder: 7, meta: { application: 'Batch dyeing of fabric to consistent colour.' } },
  { id: 508, collection: 'machinery' as const, slug: 'finishing-calender', title: 'Finishing Calender', shortDescription: 'Smooths and compacts fabric for a clean finish.', description: 'The finishing calender passes fabric between rollers to smooth and compact it.', category: 'Finishing', image: '/fabric-detail_2.jpg', images: ['/fabric-detail_2.jpg'], video: null, published: true, featured: false, displayOrder: 8, meta: { application: 'Final smoothing and compaction of finished fabric.' } },
];

function siteSettings(site?: SiteContent) { return site?.settings ?? fallbackSettings; }
function recordImage(record?: ContentRecord) { return record?.image || '/fabric-detail.jpg'; }
function recordImages(record?: ContentRecord) {
  const images = record?.images?.filter(Boolean) || [];
  return Array.from(new Set([recordImage(record), ...images]));
}
function collectionRecords(site: SiteContent | undefined, collection: string, fallbacks: ContentRecord[]) {
  const records = (site as Record<string, unknown> | undefined)?.[collection];
  return (Array.isArray(records) && records.length ? records : fallbacks) as ContentRecord[];
}
function toWhatsapp(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const PAGE_SEO: Record<string, { title: string; description: string }> = {
  '/': { title: 'Riaz Fabrics | Textile Manufacturing, Baldia Karachi', description: 'Riaz Fabrics is a textile manufacturing factory in Baldia, Karachi, producing fabric, textiles and custom designs for brands and wholesale buyers.' },
  '/about': { title: 'About Us | Riaz Fabrics', description: 'Learn about Riaz Fabrics, a textile factory in Baldia, Karachi with over 40 years of manufacturing experience.' },
  '/services': { title: 'Services | Riaz Fabrics', description: 'Custom textile manufacturing, fabric dyeing, wholesale production and design services from Riaz Fabrics in Baldia, Karachi.' },
  '/products': { title: 'Products | Riaz Fabrics', description: 'Browse our textile products including cotton cloth, dupatta textiles, frock material and custom fabric for brands and wholesale buyers.' },
  '/designs': { title: 'Design Library | Riaz Fabrics', description: 'Explore our textile design library with woven patterns, surface finishes and repeat designs for production.' },
  '/excellence': { title: 'Our Excellence | Riaz Fabrics', description: 'Four decades of textile manufacturing excellence, machinery and production capability in Baldia, Karachi.' },
  '/contact': { title: 'Contact Us | Riaz Fabrics', description: 'Get in touch with Riaz Fabrics for textile manufacturing enquiries, custom orders and factory visits in Baldia, Karachi.' },
  '/privacy': { title: 'Privacy Policy | Riaz Fabrics', description: 'How Riaz Fabrics handles your information when you visit our website or contact us.' },
  '/terms': { title: 'Terms & Conditions | Riaz Fabrics', description: 'Terms and conditions for using the Riaz Fabrics website and working with us.' },
};
function PageMeta() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.replace(/\?.*/, '').replace(/\/$/, '') || '/';
    const seo = PAGE_SEO[path] || { title: 'Riaz Fabrics', description: 'Textile manufacturing factory in Baldia, Karachi.' };
    document.title = seo.title;
    const updateMeta = (selector: string, content: string, attribute: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute(attribute, content);
    };
    updateMeta('meta[name="description"]', seo.description, 'content');
    updateMeta('meta[property="og:title"]', seo.title, 'content');
    updateMeta('meta[property="og:description"]', seo.description, 'content');
    updateMeta('meta[name="twitter:title"]', seo.title, 'content');
    updateMeta('meta[name="twitter:description"]', seo.description, 'content');
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `https://riazfabrics.com${path}`;
  }, [location]);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location]);
  return null;
}

function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem('cookie_consent')) setShow(true); }, []);
  if (!show) return null;
  const accept = () => { localStorage.setItem('cookie_consent', 'accepted'); setShow(false); };
  return <div className="fixed bottom-0 left-0 right-0 z-[55] border-t border-border bg-card p-4 shadow-lg sm:p-5"><div className="mx-auto flex max-w-[1380px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-[13px] leading-6 text-muted-foreground sm:text-sm">We use only essential session cookies for the admin panel. No tracking or analytics cookies are used. <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link></p><button type="button" onClick={accept} className="shrink-0 rounded-sm bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:px-5 sm:py-2.5">Accept</button></div></div>;
}

function Mark({ light = false }: { light?: boolean }) {
  return <span className={`flex items-center gap-2.5 ${light ? 'text-[#fbf8f0]' : 'text-primary'}`}>
    <span className={`grid h-8 w-8 shrink-0 place-items-center border ${light ? 'border-[#c9a84c]/50' : 'border-[#c9a84c]/40'} font-mono-ui text-[9px] tracking-[-.08em] sm:h-9 sm:w-9 sm:text-[10px]`} style={{ color: '#c9a84c' }}>RF</span>
    <span className="hidden text-[10px] font-extrabold uppercase leading-[1.1] tracking-[.14em] sm:block sm:text-[11px]">Riaz Fabrics</span>
  </span>;
}

function PublicShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const site = useGetSite();
  const settings = siteSettings(site.data);
  const session = useGetAdminSession();

  // Editor mode detection
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const editorParam = urlParams?.get('editor');
  const isEditorUrl = editorParam === '1';
  const [editorActive, setEditorActive] = useState(false);
  const [editorCountdown, setEditorCountdown] = useState('');
  const pageTextQuery = usePageText(location);
  const savePageText = useSavePageText();

  // On mount, check if editor mode should activate
  useEffect(() => {
    if (!isEditorUrl) { setEditorActive(false); return; }
    if (session.isLoading) return;
    if (!session.data?.authenticated) { setLocation('/admin-login'); return; }

    // Check 1-hour timer from sessionStorage
    const stored = sessionStorage.getItem('editor_start');
    const now = Date.now();
    if (stored) {
      const elapsed = now - Number(stored);
      if (elapsed > 3600000) {
        // Session expired - logout
        sessionStorage.removeItem('editor_start');
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
          setLocation('/admin-login');
        });
        return;
      }
    } else {
      sessionStorage.setItem('editor_start', String(now));
    }
    setEditorActive(true);
  }, [isEditorUrl, session.isLoading, session.data?.authenticated, setLocation]);

  // Countdown timer
  useEffect(() => {
    if (!editorActive) return;
    const interval = setInterval(() => {
      const stored = sessionStorage.getItem('editor_start');
      if (!stored) { setEditorActive(false); return; }
      const elapsed = Date.now() - Number(stored);
      const remaining = Math.max(0, 3600000 - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setEditorCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
      if (remaining <= 0) {
        sessionStorage.removeItem('editor_start');
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
          setLocation('/admin-login');
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [editorActive, setLocation]);

  // Auto-logout on page close/reload
  useEffect(() => {
    if (!editorActive) return;
    const handler = () => { sessionStorage.removeItem('editor_start'); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editorActive]);

  // Also handle visibility change (tab switch back triggers reload check)
  useEffect(() => {
    if (!editorActive) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const stored = sessionStorage.getItem('editor_start');
        if (!stored) {
          // Session was cleared (close/reload happened)
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => {
            queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
            setLocation('/admin-login');
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [editorActive, setLocation]);

  return <EditorModeContext.Provider value={editorActive}><PageTextContext.Provider value={pageTextQuery.data || null}><div data-editor-active={editorActive ? 'true' : undefined} className="min-h-[100dvh] bg-background text-foreground">
     <PageMeta /><ScrollToTop />
    {editorActive && <div data-editor-exit className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between bg-secondary px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary sm:text-[11px]"><span>Editor mode active. Click any text to edit it directly.</span><span className="flex items-center gap-3"><span className="font-mono-ui">Time left: {editorCountdown}</span><button type="button" data-editor-exit onClick={() => { sessionStorage.removeItem('editor_start'); fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => { queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() }); setLocation('/admin'); }); }} className="rounded bg-primary px-3 py-1 text-primary-foreground">Exit editor</button></span></div>}
    <EditorOverlay />
    <header className={`sticky z-40 border-b border-border/70 bg-background/95 backdrop-blur-md ${editorActive ? 'top-10' : 'top-0'}`}>
      <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:min-h-[76px] sm:gap-6 sm:px-5 sm:py-3 lg:px-10">
        <Link href="/" data-testid="link-brand"><Mark /></Link>
        <nav className="hidden flex-1 items-center justify-center gap-5 lg:flex xl:gap-8" aria-label="Primary navigation">
          {navItems.map(item => <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={`relative whitespace-nowrap py-2 text-[11px] font-semibold tracking-[.02em] transition-colors hover:text-primary ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}{location === item.href && <span className="absolute -bottom-[1px] left-0 h-px w-full bg-primary" />}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/contact" data-testid="link-header-contact" className="group flex items-center gap-2 rounded-sm bg-primary px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-primary-foreground transition-all hover:bg-secondary hover:text-primary">
            Contact Us <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <button type="button" aria-expanded={open} aria-controls="mobile-navigation" data-testid="button-toggle-menu" onClick={() => setOpen(!open)} className="rounded-sm p-3 text-primary lg:hidden">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {open && <div id="mobile-navigation" className="border-t border-border bg-card px-4 py-3 lg:hidden sm:px-5 sm:py-4">
        {navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={`block border-b border-border/70 py-3.5 text-[13px] font-semibold sm:py-4 sm:text-sm ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</Link>)}
        <Link href="/contact" onClick={() => setOpen(false)} data-testid="link-mobile-contact" className="mt-3 flex items-center justify-between rounded-sm bg-primary px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground sm:mt-4">Discuss a requirement <ArrowUpRight size={14} /></Link>
      </div>}
    </header>
    <main>{children}</main>
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div><Mark light /><p className="mt-6 max-w-sm text-sm leading-7 text-primary-foreground/65 sm:mt-8">A working textile factory in Baldia, Karachi. We make fabric and develop designs for buyers who want a clear production partner.</p></div>
        <div><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-secondary sm:text-[10px] sm:tracking-[.16em]">Navigation</p><div className="mt-4 grid gap-2.5 text-sm text-primary-foreground/70 sm:mt-5 sm:gap-3">{navItems.map(item => <Link key={item.href} href={item.href} data-testid={`link-footer-${item.label.toLowerCase().replace(/\s/g, '-')}`} className="transition-colors hover:text-secondary">{item.label}</Link>)}</div></div>
        <div><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-secondary sm:text-[10px] sm:tracking-[.16em]">Contact</p><div className="mt-4 grid gap-2.5 text-sm text-primary-foreground/70 sm:mt-5 sm:gap-3"><a href={`tel:${settings.phone || '+922132582140'}`} data-testid="link-footer-phone" className="flex items-center gap-2 hover:text-secondary"><Phone size={14} /> {settings.phone || '+92 21 3258 2140'}</a><a href={toWhatsapp(settings.whatsapp || '+923185905574', settings.whatsappMessage)} target="_blank" rel="noreferrer" data-testid="link-footer-whatsapp" className="flex items-center gap-2 hover:text-secondary"><MessageCircle size={14} /> {settings.whatsapp || '+92 318 5905574'}</a><a href={`mailto:${settings.email}`} data-testid="link-footer-email" className="flex items-center gap-2 hover:text-secondary"><Mail size={14} /> {settings.email}</a><span className="flex items-start gap-2"><MapPin size={14} className="mt-1 shrink-0" /> {settings.factoryAddress}</span></div></div>
      </div>
      <div className="mx-auto flex max-w-[1380px] flex-col gap-2 border-t border-primary-foreground/15 px-4 py-4 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary-foreground/45 sm:px-5 sm:py-5 sm:text-[9px] sm:tracking-[.12em] lg:px-10"><div className="flex flex-wrap items-center gap-3"><span>&copy; {new Date().getFullYear()} Riaz Fabrics</span><span className="hidden sm:inline">&middot;</span><Link href="/privacy" className="hover:text-primary-foreground/70">Privacy Policy</Link><span className="hidden sm:inline">&middot;</span><Link href="/terms" className="hover:text-primary-foreground/70">Terms &amp; Conditions</Link></div><span>Baldia, Karachi, Pakistan</span></div>
    </footer>
    <CookieConsent />
  </div></PageTextContext.Provider></EditorModeContext.Provider>;
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) { return <p className={`font-mono-ui text-[19px] font-semibold uppercase tracking-[.2em] ${className || 'text-secondary'} sm:text-[20px]`}>{children}</p>; }
function PageIntro({ eyebrow, title, body, heroImage }: { eyebrow: string; title: ReactNode; body: string; heroImage?: string }) {
  const img = heroImage || '/factory-hero.jpg';
  return <section className="relative overflow-hidden border-b border-border bg-[#f0ede8]">{img && <div className="absolute inset-0"><img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-r from-[#f0ede8] via-[#f0ede8]/50 to-transparent" /></div>}<div className="pointer-events-none absolute -right-20 -top-20 h-[320px] w-[320px] rounded-full bg-gradient-to-br from-secondary/15 via-secondary/8 to-transparent blur-3xl sm:h-[420px] sm:w-[420px] lg:-right-10 lg:-top-10 lg:h-[500px] lg:w-[500px]" /><div className="pointer-events-none absolute right-40 top-10 h-[200px] w-[200px] rounded-full bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent blur-2xl sm:right-60 sm:h-[260px] sm:w-[260px]" /><div className="relative mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><Eyebrow>{eyebrow}</Eyebrow><h1 className="mt-5 max-w-4xl text-balance font-display text-[2.1rem] leading-[.95] tracking-[-.035em] text-primary sm:mt-6 sm:text-[2.6rem] sm:leading-[.98] sm:tracking-[-.04em] lg:text-[3.3rem]">{title}</h1><p className="mt-5 max-w-2xl text-[15px] leading-6 text-muted-foreground sm:mt-7 sm:text-base sm:leading-7">{body}</p></div></section>;
}
function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) { return <Link href={href} data-testid={`link-arrow-${href.replace(/\W/g, '')}`} className={`group inline-flex items-center gap-3 border-b border-primary/30 pb-2 text-[11px] font-bold uppercase tracking-[.12em] text-primary transition-colors hover:border-primary ${className || ''}`}><span>{children}</span><ArrowUpRight size={15} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>; }
function BackLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} data-testid={`link-back-${href.replace(/\W/g, '')}`} className="group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/70"><ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> {children}</Link>; }
function ImageBlock({ src, alt, className = '', onClick }: { src: string; alt: string; className?: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} aria-label={`View ${alt}`} className={`group relative block w-full overflow-hidden bg-muted text-left texture-grid ${onClick ? 'cursor-zoom-in' : 'cursor-default'} ${className}`}><img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.04]" onError={(event) => { event.currentTarget.src = '/fabric-detail_2.jpg'; }} /><span className="absolute bottom-3 left-3 bg-background/80 px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-primary/65">View image</span></button>;
}

function Lightbox({ images, activeIndex, alt, onClose, onChange }: { images: string[]; activeIndex: number; alt: string; onClose: () => void; onChange: (index: number) => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onChange((activeIndex - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') onChange((activeIndex + 1) % images.length);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [activeIndex, images.length, onChange, onClose]);
  return <div role="dialog" aria-modal="true" aria-label={`${alt} image viewer`} className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/95 p-3 sm:p-8" onClick={onClose}>
    <button type="button" aria-label="Close image viewer" data-testid="button-close-lightbox" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-sm border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:right-8 sm:top-8 sm:h-11 sm:w-11"><X size={18} /></button>
    <button type="button" aria-label="Previous image" data-testid="button-lightbox-previous" onClick={(event) => { event.stopPropagation(); onChange((activeIndex - 1 + images.length) % images.length); }} className="absolute left-1.5 z-10 grid h-9 w-9 place-items-center rounded-sm border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:left-8 sm:h-11 sm:w-11"><ChevronLeft size={20} /></button>
    <div className="flex max-h-full max-w-5xl flex-col items-center gap-3 sm:gap-4" onClick={(event) => event.stopPropagation()}>
      <img src={images[activeIndex]} alt={`${alt} ${activeIndex + 1}`} className="max-h-[70vh] max-w-full object-contain sm:max-h-[78vh]" />
      <p className="font-mono-ui text-[9px] uppercase tracking-[.13em] text-primary-foreground/70 sm:text-[10px] sm:tracking-[.15em]">{activeIndex + 1} / {images.length}</p>
    </div>
    <button type="button" aria-label="Next image" data-testid="button-lightbox-next" onClick={(event) => { event.stopPropagation(); onChange((activeIndex + 1) % images.length); }} className="absolute right-1.5 z-10 grid h-9 w-9 place-items-center rounded-sm border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:right-8 sm:h-11 sm:w-11"><ChevronRight size={20} /></button>
    <p className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono-ui text-[7px] uppercase tracking-[.12em] text-primary-foreground/50 sm:bottom-4 sm:text-[9px] sm:tracking-[.14em]">Click outside or press Esc to close</p>
  </div>;
}

function Gallery({ record, label = 'Gallery' }: { record: ContentRecord; label?: string }) {
  const images = recordImages(record);
  const [active, setActive] = useState<number | null>(null);
  return <div>
    <div className="flex items-end justify-between gap-3 sm:gap-4"><div><Eyebrow>{label}</Eyebrow><h2 className="mt-1.5 font-display text-2xl text-primary sm:mt-2 sm:text-3xl">Images from the work</h2></div><span className="font-mono-ui text-[8px] uppercase tracking-[.1em] text-muted-foreground sm:text-[9px] sm:tracking-[.12em]">{images.length} {images.length === 1 ? 'image' : 'images'}</span></div>
    <div className={`mt-4 grid gap-2.5 sm:mt-6 sm:gap-3 ${images.length > 1 ? 'sm:grid-cols-2' : ''}`}>{images.map((image, index) => <ImageBlock key={`${image}-${index}`} src={image} alt={record.title} onClick={() => setActive(index)} className="h-44 sm:h-56 lg:h-72" />)}</div>
    {active !== null && <Lightbox images={images} activeIndex={active} alt={record.title} onClose={() => setActive(null)} onChange={setActive} />}
  </div>;
}

function HomePage() {
  const { data: site, isLoading, isError } = useGetSite();
  const settings = siteSettings(site); const products = collectionRecords(site, 'products', fallbackProducts); const designs = collectionRecords(site, 'designs', fallbackDesigns); const machinery = collectionRecords(site, 'machinery', fallbackMachines); const stats = site?.stats?.length ? site.stats : fallbackStats; const [heroImage, setHeroImage] = useState<number | null>(null);
  if (isLoading) return <LoadingPage />;
  return <PublicShell><section className="relative overflow-hidden bg-primary text-primary-foreground"><div className="absolute inset-0 opacity-35"><img src={settings.heroImage || '/hero-textile.jpg'} alt="Textile production floor" loading="lazy" decoding="async" className="h-full w-full object-cover mix-blend-luminosity" /></div><div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/25" /><button type="button" data-testid="button-view-hero-gallery" onClick={() => setHeroImage(0)} className="absolute right-4 top-4 z-10 border border-primary-foreground/30 bg-primary/35 px-2.5 py-1.5 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary-foreground transition-colors hover:border-secondary hover:text-secondary sm:right-5 sm:top-5 sm:px-3 sm:py-2 sm:text-[9px] sm:tracking-[.12em] lg:right-10 lg:top-10">View factory floor</button><div className="relative mx-auto flex min-h-[520px] max-w-[1380px] flex-col justify-end px-4 py-12 sm:min-h-[640px] sm:px-5 sm:py-16 lg:min-h-[calc(100vh-76px)] lg:px-10 lg:py-20"><Eyebrow>Riaz Fabrics · Baldia, Karachi</Eyebrow><h1 className="fade-up mt-4 max-w-5xl font-display text-[2.2rem] leading-[.9] tracking-[-.04em] text-[#fbf8f0] sm:mt-5 sm:text-5xl sm:leading-[.92] sm:tracking-[-.045em] lg:text-7xl">Textile manufacturing<br /><em className="text-secondary">for custom requirements.</em></h1><div className="fade-up fade-up-1 mt-7 flex flex-col gap-6 sm:mt-9 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-lg text-[15px] leading-6 text-primary-foreground/75 sm:text-base sm:leading-7">We make textile materials and products for brands, local businesses and wholesale customers from our factory in Baldia, Karachi.</p><div className="flex flex-wrap gap-2.5 sm:gap-3"><Link href="/products" data-testid="link-hero-products" className="rounded-sm bg-secondary px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-primary transition-colors hover:bg-[#fbf8f0] sm:px-5 sm:py-3 sm:tracking-[.12em]">Explore Our Products</Link><Link href="/contact" data-testid="link-hero-contact" className="rounded-sm border border-primary-foreground/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-primary-foreground transition-colors hover:border-secondary hover:text-secondary sm:px-5 sm:py-3 sm:tracking-[.12em]">Contact Us</Link></div></div></div></section>{heroImage !== null && <Lightbox images={[settings.heroImage || '/hero-textile.jpg', '/factory-hero.jpg']} activeIndex={heroImage} alt="Riaz Fabrics textile factory floor" onClose={() => setHeroImage(null)} onChange={setHeroImage} />}
    <section className="border-b border-border"><div className="mx-auto grid max-w-[1380px] gap-6 px-4 py-12 sm:gap-10 sm:px-5 sm:py-16 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-10 lg:py-24"><div><ImageBlock src="/factory-hero.jpg" alt="Textile production floor at Riaz Fabrics" className="h-[280px] sm:h-[360px] lg:h-[450px]" /></div><div className="lg:pl-8"><Eyebrow>About Riaz Fabrics</Eyebrow><h2 className="mt-4 max-w-3xl font-display text-[1.65rem] leading-[1.05] tracking-[-.03em] text-primary sm:mt-5 sm:text-[2.15rem] sm:tracking-[-.035em] lg:text-[2.8rem]">A factory that works the way you need it to.</h2><p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:mt-7 sm:text-base sm:leading-8">Around {stats.find(s => s.label === 'Machines')?.value || '99+'} machines and {stats.find(s => s.label === 'Workers')?.value || '55+'} workers. Clear communication. Direct production from sample to dispatch.</p><div className="mt-6 sm:mt-8"><ArrowLink href="/about">Who we are</ArrowLink></div></div></div></section>
    <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end sm:gap-5"><div><Eyebrow>Our Products</Eyebrow><h2 className="mt-3 font-display text-[1.65rem] tracking-[-.03em] text-primary sm:text-[2.15rem] lg:text-[2.5rem]">Textile materials and products</h2></div><ArrowLink href="/products">View all products</ArrowLink></div><div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{products.filter(p => p.featured).slice(0, 3).map(record => <ProductCard key={record.id} record={record} />)}</div></section>
     <section className="border-y border-border bg-muted/50"><div className="mx-auto grid max-w-[1380px] gap-6 px-4 py-10 sm:grid-cols-2 sm:gap-8 sm:px-5 sm:py-14 lg:grid-cols-4 lg:px-10 lg:py-20">{[...stats].sort((a,b) => a.displayOrder - b.displayOrder).map((stat, index) => <div key={stat.label} data-testid={`stat-factory-${index}`} className="border-l-2 border-secondary pl-4 sm:pl-5"><p className="font-display text-4xl tracking-[-.04em] text-primary sm:text-5xl">{stat.value}</p><p className="mt-1.5 max-w-[180px] font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:mt-2 sm:text-[9px] sm:tracking-[.14em]">{statLabel(stat)}</p></div>)}</div></section>
    <section className="bg-muted/30"><div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-12"><div><Eyebrow>Factory story</Eyebrow><h2 className="mt-4 max-w-2xl font-display text-[1.65rem] leading-tight tracking-[-.035em] text-primary sm:text-[2.15rem] lg:text-[2.5rem]">A working history, still in motion.</h2><p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">From 1980 to today and onward, Riaz Fabrics continues to grow through hands-on production in Baldia, Karachi.</p><div className="mt-6"><ArrowLink href="/excellence">Our excellence</ArrowLink></div></div><div><div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 sm:gap-2 lg:grid-cols-10">{[1980,1985,1990,1995,2000,2005,2010,2015,2020,2025].map(year => <div key={year} className="border border-border bg-card p-1.5 text-center sm:p-2"><p className="font-mono-ui text-[7px] uppercase tracking-[.1em] text-muted-foreground sm:text-[8px]">{year}</p></div>)}<div className="border border-dashed border-primary/40 bg-primary/5 p-1.5 text-center sm:p-2"><p className="font-mono-ui text-[7px] uppercase tracking-[.1em] text-primary sm:text-[8px]">Now</p></div></div><div className="mt-3 flex items-center gap-2"><div className="h-px flex-1 bg-gradient-to-r from-border to-primary/40"></div><span className="font-mono-ui text-[7px] uppercase tracking-[.12em] text-muted-foreground sm:text-[8px]">1980 to present</span><div className="h-px flex-1 bg-gradient-to-l from-border to-primary/40"></div></div></div></div></div></section>
    <section className="bg-secondary text-secondary-foreground"><div className="mx-auto grid max-w-[1380px] gap-6 px-4 py-10 sm:gap-8 sm:px-5 sm:py-14 lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:px-10 lg:py-20"><div><Eyebrow className="text-black">For buyers and partners</Eyebrow><p className="mt-3 font-mono-ui text-[11px] uppercase tracking-[.12em] text-white sm:mt-4 sm:text-[12px] sm:tracking-[.14em]">A better first conversation</p></div><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><h2 className="max-w-2xl font-display text-[1.65rem] leading-[1.02] tracking-[-.03em] text-teal-900 sm:text-[2.15rem] lg:text-[2.5rem]">Bring the brief. We will help map the production conversation.</h2><ArrowLink href="/contact" className="text-black border-black/30 hover:opacity-70">Start a conversation</ArrowLink></div></div></section>
    <section className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-24"><div><Eyebrow>Our Designs</Eyebrow><h2 className="mt-3 max-w-md font-display text-[1.65rem] leading-[1.05] tracking-[-.03em] text-primary sm:text-[2.15rem] lg:text-[2.5rem]">Patterns and finishing made for production.</h2><p className="mt-5 max-w-sm text-[15px] leading-6 text-muted-foreground sm:mt-6 sm:text-sm sm:leading-7">Browse our design library for repeat, surface and colour directions. Each one can be discussed with the factory.</p><div className="mt-6 sm:mt-8"><ArrowLink href="/designs/woven-sage-grid">Browse designs</ArrowLink></div></div><div className="grid gap-4 sm:grid-cols-2 sm:gap-6">{designs.filter(d => d.featured).slice(0,2).map((record, index) => <DesignCard key={record.id} design={record} index={index} large />)}</div></section>
    <MachinerySection machines={machinery} />
    {isError && <div className="fixed bottom-5 left-5 z-30 bg-secondary px-4 py-3 text-xs text-primary">Live site data is temporarily unavailable. Showing the factory overview.</div>}
  </PublicShell>;
}

function AboutPage() {
  const { data: site } = useGetSite(); const settings = siteSettings(site); const timeline = collectionRecords(site, 'timeline', []); const stats = site?.stats?.length ? site.stats : fallbackStats; const [activeImage, setActiveImage] = useState<number | null>(null);
  return <PublicShell><PageIntro eyebrow="About Riaz Fabrics" title={<>A factory built<br /><em>around the work.</em></>} body="Riaz Fabrics is a textile factory in Baldia, Karachi. We make fabric and textile products with clear communication and practical planning." heroImage={settings.aboutHeroImage || '/about-hero.jpg'} /><section className="mx-auto grid max-w-[1380px] gap-6 px-4 py-12 sm:gap-10 sm:px-5 sm:py-16 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-10 lg:py-24"><div><ImageBlock src="/factory-hero.jpg" alt="Riaz Fabrics textile factory floor" className="h-[300px] sm:h-[390px] lg:h-[540px]" onClick={() => setActiveImage(0)} /></div><div className="lg:pl-10"><Eyebrow>Who we are</Eyebrow><p className="mt-4 max-w-3xl font-display text-[1.65rem] leading-[1.08] tracking-[-.03em] text-primary sm:mt-6 sm:text-[2.15rem] lg:text-[2.8rem]">We work best when the brief is clear and the people making it can speak directly.</p><p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:mt-7 sm:text-base sm:leading-8">From our factory in Baldia, Karachi, we make textile materials and products for brands, local businesses and wholesale customers. Every order is handled with clear requirements, sensible planning and direct communication.</p><div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2 sm:gap-8 sm:pt-8"><div><h2 className="font-display text-lg text-primary">What we do</h2><p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4">We make textile materials and products for brands, local businesses and wholesale customers.</p></div><div><h2 className="font-display text-lg text-primary">How we work</h2><p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4">We discuss material, quantity, finish and timing early so the production plan works for you.</p></div></div></div></section>{timeline.length > 0 && <section className="border-y border-border bg-muted/50"><div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><Eyebrow>Factory story</Eyebrow><h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-[-.035em] text-primary sm:text-6xl">A working history, still in motion.</h2><div className="mt-10 grid gap-3 sm:mt-12 sm:gap-4">{[
  { year: '1980', title: 'Factory founded', body: 'Riaz Fabrics was established in Baldia, Karachi, starting with basic textile production for local customers.' },
  { year: '1990', title: 'Expanded production capacity', body: 'Added new machinery and expanded the factory floor to handle larger production runs and a growing customer base.' },
  { year: '2000', title: 'Full-range textile manufacturing', body: 'Built capability across fabric production, dyeing, finishing and packing, supporting a wider range of textile applications.' },
  { year: '2010', title: 'Quality systems strengthened', body: 'Introduced structured quality checks at each production stage, from raw material inspection through to final dispatch.' },
  { year: '2020', title: 'Modernised operations', body: 'Upgraded equipment and streamlined production workflows to improve consistency and reduce turnaround times.' },
  { year: '2026', title: 'Still growing', body: 'The factory continues to expand its production capability, machinery and team to meet evolving textile requirements.' },
].map((entry, index) => <div key={entry.year} className="relative grid gap-3 border-b border-border p-4 pl-6 last:border-0 sm:grid-cols-[120px_1fr] sm:gap-4 sm:p-5 sm:pl-8"><span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-secondary-foreground sm:text-[10px]">{String(index + 1).padStart(2, '0')} / {entry.year}</span><div><h3 className="font-display text-xl text-primary sm:text-2xl">{entry.title}</h3><p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-7">{entry.body}</p></div></div>)}</div></div></section>}<section className="bg-primary text-primary-foreground"><div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-24"><div><Eyebrow>Our factory</Eyebrow><h2 className="mt-5 font-display text-4xl leading-none tracking-[-.04em] text-[#fbf8f0] sm:text-6xl">{settings.location}<br /><em className="text-secondary">is home.</em></h2></div><div className="self-end"><p className="text-sm leading-8 text-primary-foreground/70">The factory brings together people, machinery and production knowledge for textile work that needs a dependable local partner.</p><div className="mt-8"><ArrowLink href="/contact">Contact Riaz Fabrics</ArrowLink></div></div></div></section><section className="mx-auto grid max-w-[1380px] gap-8 px-5 py-16 lg:grid-cols-3 lg:px-10 lg:py-24"><InfoTile number={stats.find((s: { label: string }) => s.label === 'Machines')?.value || '99+'} title="Manufacturing capability" body={`Approximately ${stats.find((s: { label: string }) => s.label === 'Machines')?.value || '99+'} machines support the work on the production floor.`} /><InfoTile number={stats.find((s: { label: string }) => s.label === 'Workers')?.value || '55+'} title="Production team" body={`Around ${stats.find((s: { label: string }) => s.label === 'Workers')?.value || '55+'} workers support production and day-to-day factory operations.`} /><InfoTile number={stats.find((s: { label: string }) => s.label === 'Custom Production')?.value || 'B2B'} title="Custom requirements" body="We work with customers who need textile materials and products in quantity." /></section>
    <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:gap-16">
        <div className="mx-auto max-w-sm lg:mx-0">
          <div className="overflow-hidden rounded-sm border border-black/[.06] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)]">
            <img src={settings.founderImage || '/founder.jpg'} alt={settings.founderName || 'Founder'} loading="lazy" decoding="async" className="h-[340px] w-full object-cover sm:h-[420px]" />
          </div>
        </div>
        <div>
          <Eyebrow>Founder</Eyebrow>
          <blockquote className="mt-5 font-display text-[1.65rem] leading-[1.15] tracking-[-.03em] text-primary sm:text-[2.15rem] lg:text-[2.5rem]">
            &ldquo;{settings.founderQuote || 'We started with one machine and a clear idea: make textiles that actually work for the people who use them.'}&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px w-10 bg-primary/20" />
            <div>
              <p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground sm:text-[10px]">{settings.founderTitle || 'Founder & Managing Director'}</p>
              <p className="mt-1 font-display text-lg text-primary sm:text-xl">{settings.founderName || 'Riaz Ahmed'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="bg-secondary text-secondary-foreground"><div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-10 sm:px-5 sm:py-16 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-24"><div><Eyebrow className="text-white">Book a survey or visit</Eyebrow><h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight tracking-[-.035em] text-teal-900 sm:text-4xl lg:text-5xl">Come see the factory floor.</h2><p className="mt-5 max-w-xl text-[15px] leading-7 text-black sm:mt-6 sm:text-base sm:leading-8">Book a time to visit the factory, see the machines, or discuss your requirements in person. We welcome visits from buyers, partners and anyone interested in textile manufacturing in Karachi.</p></div><div className="self-center"><div className="space-y-5"><div className="flex items-start gap-4"><Phone size={20} className="mt-0.5 shrink-0 text-white" /><div><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-white sm:text-[10px]">Phone / WhatsApp</p><a href={`tel:${(settings.phone || '+923185905574').replace(/\s/g, '')}`} className="mt-1 block font-display text-2xl text-teal-900 hover:text-teal-800 sm:text-3xl">{settings.phone || '+92 318 5905574'}</a><a href={toWhatsapp(settings.whatsapp || '+923185905574', settings.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[13px] text-black font-semibold underline hover:opacity-70 sm:text-sm">Chat on WhatsApp</a></div></div><div className="flex items-start gap-4"><MapPin size={20} className="mt-0.5 shrink-0 text-white" /><div><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-white sm:text-[10px]">Factory location</p><p className="mt-1 text-[15px] text-black sm:text-base">{settings.factoryAddress}</p></div></div></div><div className="mt-8"><ArrowLink href="/contact" className="text-black border-black/30 hover:opacity-70">Request a visit</ArrowLink></div></div></div></section>
{activeImage !== null && <Lightbox images={['/factory-hero.jpg']} activeIndex={activeImage} alt="Riaz Fabrics textile factory floor" onClose={() => setActiveImage(null)} onChange={setActiveImage} />}</PublicShell>;
}

function ServicesPage() {
  const { data: site } = useGetSite(); const services = collectionRecords(site, 'services', fallbackServices); const settings = siteSettings(site);
  return <PublicShell><PageIntro eyebrow="Services" title={<>Production support<br /><em>that stays practical.</em></>} body="Clear support from the first sample to the finished product, with direct communication throughout." heroImage={settings.servicesHeroImage || '/services-hero.jpg'} /><section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{services.map(service => <Link href={`/services/${service.slug}`} key={service.id} data-testid={`service-row-${service.id}`} className="group rounded-sm border border-black/[.06] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.1)] sm:p-6"><div className="flex items-start justify-between gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-muted text-primary sm:h-10 sm:w-10"><Factory size={16} /></span><ArrowUpRight size={16} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><p className="mt-6 font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:mt-8 sm:text-[9px] sm:tracking-[.14em]">{service.category || 'Production service'}</p><h2 className="mt-2 font-display text-2xl tracking-[-.025em] text-primary sm:text-3xl">{service.title}</h2><p className="mt-3 text-[13px] leading-6 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-7">{service.shortDescription || service.description}</p><span className="mt-5 inline-block text-[10px] font-bold uppercase tracking-[.12em] text-primary sm:mt-6">View service</span></Link>)}</div></section><section className="bg-muted/60"><div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 lg:grid-cols-[.75fr_1.25fr] lg:px-10 lg:py-24"><div><Eyebrow>Before we start</Eyebrow><h2 className="mt-4 font-display text-[1.65rem] leading-[1.05] tracking-[-.03em] text-primary sm:mt-5 sm:text-[2.15rem] lg:text-[2.5rem]">Good orders start with the right questions.</h2></div><div className="grid gap-3 sm:grid-cols-2 sm:gap-4"><InfoTile number="End use" title="What will it become?" body="The application helps shape the useful construction and finish." /><InfoTile number="Quantity" title="What needs to repeat?" body="We separate the must-haves from the nice-to-haves." /><InfoTile number="Finish" title="How should it feel?" body="Hand-feel, drape and surface finish shape the process." /><InfoTile number="Lead time" title="When does it need to ship?" body="Timing determines the production plan and material readiness." /></div></div></section><section className="border-t border-border bg-muted/30"><div className="mx-auto max-w-[860px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-20"><Eyebrow>Terms &amp; Conditions</Eyebrow><div className="mt-6 space-y-4 text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7"><p>All products are manufactured to order. Specifications, colours and finishes may vary based on material availability and production processes. Images on this website are for reference only.</p><p>Prices quoted are indicative and subject to confirmation based on order volume, material costs and specifications. Final pricing is agreed upon before production begins.</p><p>All designs, patterns and content on this website are the property of Riaz Fabrics unless stated otherwise.</p><p>For full terms, visit our <Link href="/terms" className="text-primary underline">Terms &amp; Conditions page</Link>.</p></div></div></section></PublicShell>;
}
function InfoTile({ number, title, body }: { number: string; title: string; body: string }) { return <div className="border border-black/[.06] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.1)] sm:p-6"><span className="font-mono-ui text-[9px] text-primary sm:text-[10px]">{number}</span><h3 className="mt-5 font-display text-xl text-primary sm:mt-8 sm:text-2xl">{title}</h3><p className="mt-2 text-[13px] leading-6 text-muted-foreground sm:mt-3 sm:text-sm">{body}</p></div>; }

function DesignsPage() {
  const { data: site, isLoading, isError } = useGetSite();
  const designs = collectionRecords(site, 'designs', fallbackDesigns); const settings = siteSettings(site);
  if (isLoading) return <LoadingPage />;
  return <PublicShell>
    <PageIntro eyebrow="Design library" title={<>Design directions<br /><em>made practical.</em></>} body="Browse our design library for repeat, surface and colour directions that can be discussed with the factory." heroImage={settings.designsHeroImage || '/designs-hero.jpg'} />
    <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24">
      {isError && <div className="mb-6 border-l-2 border-secondary bg-secondary/20 px-3 py-2.5 text-[13px] text-primary sm:mb-8 sm:px-4 sm:py-3 sm:text-sm">Showing the latest saved design directions while the live library reconnects.</div>}
      {designs.length === 0 ? <EmptyState title="No design directions yet." body="Share a reference or material brief and our team can help shape the first sample." /> : <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-2">{designs.map((design, index) => <DesignCard key={design.id} design={design} index={index} />)}</div>}
    </section>
    <section className="bg-primary text-primary-foreground"><div className="mx-auto grid max-w-[1380px] gap-6 px-4 py-12 sm:gap-8 sm:px-5 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:px-10 lg:py-20"><Eyebrow>From reference to repeat</Eyebrow><p className="max-w-2xl font-display text-3xl leading-tight tracking-[-.03em] text-[#fbf8f0] sm:text-4xl lg:text-5xl">Bring a swatch, image or clear idea. We will discuss what can be repeated on the factory floor.</p></div></section>
  </PublicShell>;
}

function DesignCard({ design, index, large }: { design: ContentRecord; index: number; large?: boolean }) {
  const images = recordImages(design);
  const [active, setActive] = useState<number | null>(null);
  return <article className={`group overflow-hidden rounded-sm border border-black/[.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.1)] ${large ? '' : index % 3 === 1 ? 'lg:mt-16' : ''}`}>
    <button type="button" data-testid={`button-view-design-${design.id}`} onClick={() => setActive(0)} className={`relative block w-full overflow-hidden bg-muted text-left cursor-zoom-in ${large ? 'h-[340px] sm:h-[440px]' : 'h-[240px] sm:h-[320px]'}`}>
      <img src={images[0]} alt={design.title} className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.04]" onError={(event) => { event.currentTarget.src = '/fabric-detail.jpg'; }} />
      <span className="absolute bottom-2.5 left-2.5 bg-background/85 px-2 py-1 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary/70 sm:bottom-3 sm:left-3 sm:text-[9px] sm:tracking-[.12em]">View images</span>
    </button>
    <Link href={`/designs/${design.slug}`} data-testid={`link-design-detail-${design.id}`} className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/30 sm:p-5 sm:gap-4">
      <div><p className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px] sm:tracking-[.14em]">{design.category || 'Design study'}</p><h2 className="mt-1.5 font-display text-2xl tracking-[-.025em] text-primary sm:mt-2 sm:text-3xl">{design.title}</h2><p className="mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground sm:mt-3 sm:text-sm">{design.shortDescription}</p></div>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:mt-1 sm:h-9 sm:w-9"><ArrowUpRight size={14} /></span>
    </Link>
    {active !== null && <Lightbox images={images} activeIndex={active} alt={design.title} onClose={() => setActive(null)} onChange={setActive} />}
  </article>;
}

  function ExcellencePage() {
   const { data: site } = useGetSite(); const machines = collectionRecords(site, 'machinery', fallbackMachines); const settings = siteSettings(site); const stats = site?.stats?.length ? site.stats : fallbackStats;
  const [floorImage, setFloorImage] = useState<number | null>(null);
  return <PublicShell><PageIntro eyebrow="Our Excellence" title={<>Our excellence comes from<br /><em>our experience.</em></>} body="With over four decades on the production floor, Riaz Fabrics has built capability through continuous hands-on manufacturing in Baldia, Karachi." heroImage={settings.excellenceHeroImage || '/excellence-hero.jpg'} /><section className="border-y border-border bg-muted/50"><div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><Eyebrow>Experience timeline</Eyebrow><h2 className="mt-4 max-w-2xl font-display text-[1.65rem] leading-tight tracking-[-.035em] text-primary sm:text-[2.15rem] lg:text-[2.5rem]">Over four decades and still growing.</h2><p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground sm:mt-6 sm:text-base sm:leading-8">From 1980 to today and onward, the factory has built capability through decades of continuous production work in Baldia, Karachi.</p><div className="mt-10 grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2 lg:grid-cols-10">{[1980,1985,1990,1995,2000,2005,2010,2015,2020,2025].map(year => <div key={year} className="border border-border bg-card p-1.5 text-center sm:p-2"><p className="font-mono-ui text-[7px] uppercase tracking-[.12em] text-muted-foreground sm:text-[8px]">{year}</p></div>)}<div className="border border-dashed border-primary/40 bg-primary/5 p-1.5 text-center sm:p-2"><p className="font-mono-ui text-[7px] uppercase tracking-[.12em] text-primary sm:text-[8px]">Now</p></div></div><div className="mt-3 flex items-center gap-2"><div className="h-px flex-1 bg-gradient-to-r from-border to-primary/40"></div><span className="font-mono-ui text-[7px] uppercase tracking-[.12em] text-muted-foreground sm:text-[8px]">1980 to present</span><div className="h-px flex-1 bg-gradient-to-l from-border to-primary/40"></div></div></div></section><section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="grid gap-4 sm:gap-5 md:grid-cols-12"><div className="md:col-span-7"><ImageBlock src="/factory-hero.jpg" alt="Riaz Fabrics textile factory floor" onClick={() => setFloorImage(0)} className="h-[280px] sm:h-[430px] md:h-[520px]" /></div><div className="flex flex-col justify-between rounded-sm border border-border bg-muted p-5 sm:p-6 md:col-span-5 md:p-8"><Eyebrow>The people and process</Eyebrow><div><h2 className="font-display text-[1.65rem] leading-none tracking-[-.03em] text-primary sm:text-[2.15rem]">Quality is built through daily checks.</h2><p className="mt-4 text-[13px] leading-6 text-muted-foreground sm:mt-6 sm:text-sm sm:leading-7">Every order goes through checks at each stage, from raw material to packed roll.</p></div><p className="mt-4 font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:mt-0 sm:text-[9px] sm:tracking-[.13em]">Baldia, Karachi / production floor</p></div></div><div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"><InfoTile number={stats.find((s: { label: string }) => s.label === 'Machines')?.value || '99+'} title="Manufacturing capability" body={`Approximately ${stats.find((s: { label: string }) => s.label === 'Machines')?.value || '99+'} machines support textile production.`} /><InfoTile number={stats.find((s: { label: string }) => s.label === 'Workers')?.value || '55+'} title="Production team" body={`Around ${stats.find((s: { label: string }) => s.label === 'Workers')?.value || '55+'} workers support the factory's day-to-day work.`} /><InfoTile number="Custom" title="Production scale" body="The factory supports larger quantity requirements where applicable." /><InfoTile number="Textile" title="Product expertise" body="Fabric and textile product manufacturing for defined requirements." /><InfoTile number="Checks" title="Quality" body="Quality checking is part of the production process." /><InfoTile number="Custom" title="Customer requirements" body="Production can be discussed around the customer's actual brief." /></div></section><MachinerySection machines={machines} /></PublicShell>;
}

function MachineCard({ machine }: { machine: ContentRecord }) {
  const images = recordImages(machine);
  const [active, setActive] = useState<number | null>(null);
  const application = (machine.meta as Record<string, unknown>)?.application as string | undefined;
  return <div className="group rounded-sm border border-black/[.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.1)]"><ImageBlock src={images[0]} alt={machine.title} onClick={() => setActive(0)} className="h-48 sm:h-56" /><Link href={`/machinery/${machine.slug}`} data-testid={`link-machinery-detail-${machine.id}`} className="block p-5 transition-colors hover:bg-muted/30"><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">{machine.category || 'Factory'}</p><p className="mt-2 font-display text-2xl text-primary">{machine.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{machine.shortDescription}</p>{application && <div className="mt-3 border-t border-border pt-3"><p className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-secondary">What it is used for</p><p className="mt-1 text-[13px] leading-5 text-muted-foreground">{application}</p></div>}<span className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary">View machine <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span></Link>{active !== null && <Lightbox images={images} activeIndex={active} alt={machine.title} onClose={() => setActive(null)} onChange={setActive} />}</div>;
}

function MachinerySection({ machines }: { machines: ContentRecord[] }) {
  const primary = machines.filter(m => m.featured);
  const gallery = machines.filter(m => !m.featured);
  const [galleryActive, setGalleryActive] = useState<number | null>(null);
  const galleryImages = gallery.map(m => recordImage(m));
  if (primary.length === 0) return null;
  return <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24">
    <div className="border-t border-border pt-8 sm:pt-10">
      <Eyebrow>Our Machinery</Eyebrow>
      <h2 className="mt-4 font-display text-[1.65rem] text-primary sm:text-[2.15rem]">Equipment on the floor.</h2>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">The factory runs with machinery for fabric production, processing and finishing work.</p>
    </div>
    <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">{primary.map(machine => <MachineCard key={machine.id} machine={machine} />)}</div>
    {gallery.length > 0 && <div className="mt-12 border-t border-border pt-8 sm:mt-16 sm:pt-10">
      <Eyebrow>Factory Floor</Eyebrow>
      <h3 className="mt-4 font-display text-xl text-primary sm:text-2xl">Additional machinery and work areas.</h3>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{gallery.map((item, index) => <button key={item.id} type="button" onClick={() => setGalleryActive(index)} className="group relative block w-full overflow-hidden bg-muted texture-grid cursor-zoom-in"><img src={recordImage(item)} alt={item.title} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.04]" onError={(e) => { e.currentTarget.src = '/fabric-detail_2.jpg'; }} /><span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-3"><span className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-primary-foreground">{item.title}</span></span></button>)}</div>
      {galleryActive !== null && <Lightbox images={galleryImages} activeIndex={galleryActive} alt="Factory machinery gallery" onClose={() => setGalleryActive(null)} onChange={setGalleryActive} />}
    </div>}
  </section>;
}

function ContactPage() {
  const { data: site } = useGetSite(); const settings = siteSettings(site);
  const [honeypot, setHoneypot] = useState('');
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (honeypot) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = data.get('name');
    const email = data.get('email');
    const message = data.get('message');
    const text = `Hello, I would like to enquire.%0A%0AName: ${name}%0AEmail: ${email}%0AMessage: ${message}`;
    window.open(`https://wa.me/923185905574?text=${text}`, '_blank');
    form.reset();
  };
  return <PublicShell><PageIntro eyebrow="Contact Us" title={<>Discuss your<br /><em>requirement.</em></>} body="Tell us what you need and where it will be used. We will get back to you with next steps." heroImage={settings.contactHeroImage || '/contact-hero.jpg'} /><section className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:px-10 lg:py-24"><div><Eyebrow>Direct lines</Eyebrow><div className="mt-6 grid gap-2 sm:mt-8 sm:gap-3"><ContactLine icon={<Phone size={16} />} label="Phone" value={settings.phone || '+92 318 5905574'} href={`tel:${settings.phone || '+923185905574'}`} /><ContactLine icon={<MessageCircle size={16} />} label="WhatsApp" value={settings.whatsapp || '+92 318 5905574'} href={toWhatsapp(settings.whatsapp || '+923185905574', settings.whatsappMessage)} external /><ContactLine icon={<Mail size={16} />} label="Email" value={settings.email || 'info@riazfabrics.com'} href={`mailto:${settings.email || 'info@riazfabrics.com'}`} /></div><div className="mt-10 border-t border-border pt-5 sm:mt-14 sm:pt-6"><Eyebrow>Business hours</Eyebrow><div className="mt-3 grid gap-1.5 text-[13px] text-muted-foreground sm:text-sm sm:grid-cols-2">{(settings.businessHours || 'Monday to Thursday: 9:00 AM - 5:00 PM. Friday: Closed. Saturday & Sunday: 9:00 AM - 5:00 PM.').split('.').filter(Boolean).map((line, i) => <p key={i}>{line.trim()}</p>)}</div></div></div><div className="grid gap-3 sm:grid-cols-2 sm:gap-4"><div className="flex flex-col items-center text-center rounded-sm bg-primary p-6 text-primary-foreground sm:p-8"><MapPin size={32} className="text-secondary" /><p className="mt-4 font-mono-ui text-[10px] uppercase tracking-[.13em] text-secondary sm:text-[11px] sm:tracking-[.15em]">Office</p><p className="mt-2 text-[15px] leading-6 text-primary-foreground/80 sm:text-base">{settings.officeAddress}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.officeAddress || 'Baldia Karachi Pakistan')}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 border border-secondary/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-secondary transition-colors hover:bg-secondary hover:text-primary sm:text-[11px]"><MapPin size={14} /> Map location</a></div><div className="flex flex-col items-center text-center rounded-sm border border-border p-6 sm:p-8"><Factory size={32} className="text-primary" /><p className="mt-4 font-mono-ui text-[10px] uppercase tracking-[.13em] text-primary sm:text-[11px] sm:tracking-[.15em]">Factory</p><p className="mt-2 text-[15px] leading-6 text-muted-foreground sm:text-base">{settings.factoryAddress}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.factoryAddress || 'Baldia Karachi Pakistan')}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 border border-primary/30 px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:text-[11px]"><MapPin size={14} /> Map location</a></div><div className="flex flex-col items-center text-center rounded-sm border border-border p-6 sm:col-span-2 sm:p-8"><MessageCircle size={24} className="text-primary" /><p className="mt-4 font-display text-xl leading-tight text-primary sm:text-2xl">Got a question, ready to order, or want to book a visit?</p><p className="mt-3 max-w-lg text-[15px] leading-6 text-muted-foreground sm:text-base">WhatsApp is the fastest way to reach us. Send a message with your requirement and we will reply quickly.</p><div className="mt-5 sm:mt-6"><a href={toWhatsapp(settings.whatsapp || '+923185905574', settings.whatsappMessage)} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 rounded-sm bg-secondary px-5 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-primary transition-colors hover:bg-[#fbf8f0] sm:px-6 sm:py-3.5 sm:text-[12px]"><MessageCircle size={15} /> Message on WhatsApp</a></div></div></div></section><section className="border-t border-border"><div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="mx-auto max-w-xl"><Eyebrow>Send an enquiry</Eyebrow><h2 className="mt-3 font-display text-2xl text-primary sm:mt-4 sm:text-3xl">Tell us about your requirement.</h2><p className="mt-3 text-[15px] leading-6 text-muted-foreground sm:text-base">Fill in the details and we will get back to you via WhatsApp.</p><form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:mt-8"><div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label htmlFor="website">Leave this blank</label><input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></div><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground sm:text-[10px]">Name</span><input name="name" required className="mt-1.5 w-full border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-primary sm:mt-2 sm:py-3" /></label><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground sm:text-[10px]">Email</span><input name="email" type="email" required className="mt-1.5 w-full border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-primary sm:mt-2 sm:py-3" /></label><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground sm:text-[10px]">Message</span><textarea name="message" required rows={4} className="mt-1.5 w-full border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-primary resize-none sm:mt-2 sm:py-3" /></label><button type="submit" className="flex items-center justify-center gap-2 rounded-sm bg-secondary px-6 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-primary hover:bg-[#fbf8f0] sm:py-3.5 sm:text-[12px]"><MessageCircle size={15} /> Send via WhatsApp</button></form></div></div></section></PublicShell>;
}
function ContactLine({ icon, label, value, href, external }: { icon: ReactNode; label: string; value: string; href: string; external?: boolean }) { return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} data-testid={`link-contact-${label.toLowerCase()}`} className="group flex items-center gap-3 border-b border-border py-4 sm:gap-4 sm:py-5"><span className="grid h-9 w-9 shrink-0 place-items-center bg-muted text-primary sm:h-10 sm:w-10">{icon}</span><span className="min-w-0"><span className="block font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px] sm:tracking-[.14em]">{label}</span><span className="mt-0.5 block text-[13px] text-primary group-hover:underline sm:text-sm">{value}</span></span><ArrowUpRight size={14} className="ml-auto shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:size-15" /></a>; }

function PrivacyPage() {
  return <PublicShell><PageIntro eyebrow="Legal" title={<>Privacy Policy</>} body="How we handle your information when you visit our website or contact us." /><section className="mx-auto max-w-[860px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="prose prose-sm max-w-none space-y-8 text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8"><h2 className="font-display text-2xl text-primary">1. Who we are</h2><p>Riaz Fabrics is a textile manufacturing company based in Baldia, Karachi, Pakistan. We operate this website to share information about our factory, products and services.</p><h2 className="font-display text-2xl text-primary">2. Information we collect</h2><p>When you visit our website, we do not collect personal data automatically. If you contact us via phone, WhatsApp or email, we may retain the information you provide in order to respond to your enquiry and manage our business relationship.</p><h2 className="font-display text-2xl text-primary">3. How we use your information</h2><p>We use the information you share to respond to your enquiries, provide quotations and manage production orders. We do not sell, trade or rent your personal information to third parties.</p><h2 className="font-display text-2xl text-primary">4. Cookies and tracking</h2><p>Our website does not use cookies or third-party tracking tools. The admin panel uses a session cookie for authentication purposes only.</p><h2 className="font-display text-2xl text-primary">5. Data security</h2><p>We take reasonable steps to protect the information you share with us. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.</p><h2 className="font-display text-2xl text-primary">6. Third-party links</h2><p>Our website may contain links to external services such as Google Maps. These services have their own privacy policies, and we are not responsible for their practices.</p><h2 className="font-display text-2xl text-primary">7. Changes to this policy</h2><p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated date.</p><h2 className="font-display text-2xl text-primary">8. Contact us</h2><p>If you have questions about this policy, you can reach us at our factory in Baldia, Karachi, Pakistan, or via the contact details on our <a href="/contact" className="text-primary underline">contact page</a>.</p></div></section></PublicShell>;
}

function TermsPage() {
  return <PublicShell><PageIntro eyebrow="Legal" title={<>Terms &amp; Conditions</>} body="The terms that apply when you use our website or work with us." /><section className="mx-auto max-w-[860px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="prose prose-sm max-w-none space-y-8 text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8"><h2 className="font-display text-2xl text-primary">1. About us</h2><p>Riaz Fabrics is a textile manufacturing company registered in Pakistan, operating from Baldia, Karachi. We manufacture textile products, fabrics and designs for domestic and international buyers.</p><h2 className="font-display text-2xl text-primary">2. Website use</h2><p>The information on this website is provided for general purposes. We make reasonable efforts to keep it accurate, but we do not guarantee that all content is always complete or up to date.</p><h2 className="font-display text-2xl text-primary">3. Products and services</h2><p>All products shown on this website are manufactured to order. Specifications, colours and finishes may vary based on material availability and production processes. Images on the website are for reference only.</p><h2 className="font-display text-2xl text-primary">4. Pricing and orders</h2><p>Prices quoted are indicative and subject to confirmation based on order volume, material costs and specifications. Final pricing is agreed upon before production begins.</p><h2 className="font-display text-2xl text-primary">5. Intellectual property</h2><p>All designs, patterns and content on this website are the property of Riaz Fabrics unless stated otherwise. You may not reproduce, distribute or use our content without written permission.</p><h2 className="font-display text-2xl text-primary">6. Limitation of liability</h2><p>We are not liable for any indirect, incidental or consequential damages arising from the use of our website or products. Our liability is limited to the value of the specific order in question.</p><h2 className="font-display text-2xl text-primary">7. Governing law</h2><p>These terms are governed by the laws of Pakistan. Any disputes shall be resolved in the courts of Karachi.</p><h2 className="font-display text-2xl text-primary">8. Contact</h2><p>For questions about these terms, please <a href="/contact" className="text-primary underline">contact us</a>.</p></div></section></PublicShell>;
}

function ProductsPage() {
  const { data: site, isLoading } = useGetSite();
  const products = collectionRecords(site, 'products', fallbackProducts);
  const designs = collectionRecords(site, 'designs', fallbackDesigns);
  const settings = siteSettings(site);
  const [activeTab, setActiveTab] = useState<'products' | 'designs'>('products');
  if (isLoading) return <LoadingPage />;
  return <PublicShell><PageIntro eyebrow="Our Products" title={<>Textile products<br /><em>made for you.</em></>} body="We make textile materials and products for brands, local businesses and wholesale customers. This is a manufacturing catalogue, not a retail shop." heroImage={settings.productsHeroImage || '/products-hero.jpg'} /><section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10 lg:py-24"><div className="flex gap-0.5 border-b border-border sm:gap-1">{({ key: 'products', label: 'Products' } as const).key && ['products', 'designs'].map(tab => <button type="button" key={tab} onClick={() => setActiveTab(tab as 'products' | 'designs')} data-testid={`button-tab-${tab}`} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] transition-colors sm:px-5 sm:py-3 ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-primary'}`}>{tab === 'products' ? 'Products' : 'Designs'}</button>)}</div><div className="mt-8 sm:mt-10">{activeTab === 'products' ? <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{products.map(record => <ProductCard key={record.id} record={record} />)}</div> : <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">{designs.map((record, index) => <DesignCard key={record.id} design={record} index={index} />)}</div>}</div></section><section className="bg-muted/60"><div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-10 sm:px-5 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:px-10 lg:py-24"><div><Eyebrow>Custom textile products</Eyebrow><h2 className="mt-3 font-display text-[1.65rem] leading-tight text-primary sm:mt-4 sm:text-[2.15rem] lg:text-[2.8rem]">Need something specific?</h2></div><div><p className="max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">Share what you need. We will review the requirement and let you know what is possible.</p><div className="mt-6 sm:mt-8"><ArrowLink href="/contact">Request a manufacturing inquiry</ArrowLink></div></div></div></section></PublicShell>;
}

function ProductCard({ record }: { record: ContentRecord }) {
  const images = recordImages(record);
  const [active, setActive] = useState<number | null>(null);
  return <article className="group overflow-hidden rounded-sm border border-black/[.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.1)]">
    <button type="button" data-testid={`button-view-product-${record.id}`} onClick={() => setActive(0)} className="relative block h-56 w-full overflow-hidden bg-muted text-left cursor-zoom-in sm:h-72"><img src={images[0]} alt={record.title} className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.04]" onError={(event) => { event.currentTarget.src = '/fabric-detail.jpg'; }} /><span className="absolute bottom-2.5 left-2.5 bg-background/85 px-2 py-1 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary/70 sm:bottom-3 sm:left-3 sm:text-[9px] sm:tracking-[.12em]">View images</span></button>
    <Link href={`/products/${record.slug}`} data-testid={`link-product-detail-${record.id}`} className="block p-4 transition-colors hover:bg-muted/30 sm:p-5"><p className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px] sm:tracking-[.14em]">{record.category || 'Textile product'}</p><h2 className="mt-1.5 font-display text-2xl text-primary sm:mt-2 sm:text-3xl">{record.title}</h2><p className="mt-2 text-[13px] leading-6 text-muted-foreground sm:mt-3 sm:text-sm">{record.shortDescription}</p><span className="group/btn mt-4 inline-flex items-center gap-1.5 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground sm:mt-6 sm:px-4 sm:py-2.5">View product <ArrowUpRight size={13} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" /></span></Link>
    {active !== null && <Lightbox images={images} activeIndex={active} alt={record.title} onClose={() => setActive(null)} onChange={setActive} />}
  </article>;
}

function DetailPage({ kind }: { kind: 'products' | 'designs' | 'machinery' | 'services' }) {
  const { slug } = useParams<{ slug: string }>(); const { data: site, isLoading } = useGetSite();
  const fallbacks = kind === 'products' ? fallbackProducts : kind === 'designs' ? fallbackDesigns : [];
  const record = collectionRecords(site, kind, fallbacks).find(item => item.slug === slug);
  if (isLoading) return <LoadingPage />;
  if (!record) return <PublicShell><EmptyState title="We could not find that entry." body="The page may have moved. Our team can still help with a specific requirement." /></PublicShell>;
  const basePath = kind === 'products' ? '/products' : kind === 'designs' ? '/designs' : kind === 'machinery' ? '/excellence' : '/services';
  const backLabel = kind === 'products' ? 'Our Products' : kind === 'designs' ? 'Our Designs' : kind === 'machinery' ? 'Machinery' : 'Services';
  const inquiryLabel = kind === 'products' ? 'Discuss this product' : kind === 'designs' ? 'Discuss this design' : 'Request a manufacturing inquiry';
  return <PublicShell><section className="border-b border-border bg-card"><div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-5 sm:py-8 lg:px-10 lg:py-12"><BackLink href={basePath}>{`Back to ${backLabel}`}</BackLink><div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[.9fr_1.1fr]"><div className="order-2 lg:order-1"><div className="flex flex-wrap gap-1.5 sm:gap-2">{record.category && <span className="rounded-sm border border-border px-2.5 py-1.5 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary sm:px-3 sm:py-2 sm:text-[9px] sm:tracking-[.12em]">{record.category}</span>}{Object.entries(record.meta || {}).slice(0, 2).map(([key, value]) => <span key={key} className="rounded-sm border border-border px-2.5 py-1.5 font-mono-ui text-[8px] uppercase tracking-[.1em] text-muted-foreground sm:px-3 sm:py-2 sm:text-[9px] sm:tracking-[.12em]">{key}: {String(value)}</span>)}</div><h1 className="mt-5 max-w-2xl font-display text-4xl leading-[.95] tracking-[-.035em] text-primary sm:mt-7 sm:text-5xl sm:tracking-[-.04em] lg:text-7xl">{record.title}</h1><p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground sm:mt-7 sm:text-base sm:leading-8">{record.shortDescription}</p><div className="mt-6 sm:mt-8"><ArrowLink href="/contact">{inquiryLabel}</ArrowLink></div></div><div className="order-1 lg:order-2"><Gallery record={record} label={`${backLabel} gallery`} /></div></div></div></section><section className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-24"><div><Eyebrow>{kind === 'products' ? 'Manufacturing information' : kind === 'machinery' ? 'Factory information' : 'Additional information'}</Eyebrow></div><div className="max-w-2xl"><p className="whitespace-pre-line text-lg leading-8 text-primary sm:text-xl sm:leading-9">{record.description}</p>{kind === 'products' && <div className="mt-10 border-t border-border pt-5 sm:mt-12 sm:pt-6"><p className="font-mono-ui text-[8px] uppercase tracking-[.13em] text-muted-foreground sm:text-[9px] sm:tracking-[.15em]">Built around your requirement</p><p className="mt-2.5 text-[13px] leading-6 text-muted-foreground sm:mt-3 sm:text-sm sm:leading-7">Specifications shown here are a starting point. We confirm construction, colour, finish, minimums and timing against the actual application before production.</p></div>}</div></section></PublicShell>;
}

function AdminLoginPage() {
  const [, setLocation] = useLocation(); const login = useLoginAdmin(); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); login.mutate({ data: { username, password } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() }); setLocation('/admin'); }, onError: () => setError('The credentials were not accepted. Please try again.') }); };
  return <div className="min-h-[100dvh] bg-primary text-primary-foreground"><div className="mx-auto grid min-h-[100dvh] max-w-[1380px] lg:grid-cols-[1fr_.85fr]"><div className="flex flex-col justify-between p-5 sm:p-6 lg:p-12"><Link href="/" data-testid="link-login-brand"><Mark light /></Link><div className="max-w-xl py-16 sm:py-20"><Eyebrow>Private workspace</Eyebrow><h1 className="mt-5 font-display text-5xl leading-[.95] tracking-[-.045em] text-[#fbf8f0] sm:mt-6 sm:text-6xl lg:text-8xl">Keep the<br /><em className="text-secondary">floor moving.</em></h1><p className="mt-6 max-w-sm text-[13px] leading-6 text-primary-foreground/60 sm:mt-8 sm:text-sm sm:leading-7">Content management for the Riaz Fabrics team.</p><div className="mt-8 sm:mt-10"><Link href="/" className="inline-flex items-center gap-2 rounded-sm border border-primary-foreground/25 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground/80 transition-colors hover:border-secondary hover:text-secondary sm:px-5 sm:py-3"><ArrowLeft size={14} /> Back to website</Link></div></div><p className="font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary-foreground/40 sm:text-[9px] sm:tracking-[.12em]">AR / Admin access</p></div><div className="flex items-center bg-card p-5 text-foreground sm:p-6 lg:p-16"><form onSubmit={submit} className="w-full max-w-md" data-testid="form-admin-login"><div className="mb-8 sm:mb-10"><Eyebrow>Sign in</Eyebrow><h2 className="mt-3 font-display text-3xl tracking-[-.03em] text-primary sm:mt-4 sm:text-4xl">Welcome back.</h2></div><label className="mb-5 block sm:mb-6"><span className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px] sm:tracking-[.14em]">Username</span><input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required data-testid="input-admin-username" className="mt-1.5 w-full border-b border-border bg-transparent px-0 py-2.5 text-sm outline-none transition-colors focus:border-primary sm:mt-2 sm:py-3" /></label><label className="mb-6 block sm:mb-7"><span className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px] sm:tracking-[.14em]">Password</span><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required data-testid="input-admin-password" className="mt-1.5 w-full border-b border-border bg-transparent px-0 py-2.5 pr-8 text-sm outline-none transition-colors focus:border-primary sm:mt-2 sm:py-3" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary" tabIndex={-1}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{error && <p data-testid="status-login-error" className="mb-5 text-[13px] text-destructive sm:mb-6">{error}</p>}<button type="submit" disabled={login.isPending} data-testid="button-admin-login" className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary">{login.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Sign in</button></form></div></div></div>;
}

function LoadingPage() { return <div className="min-h-[100dvh] bg-background"><div className="mx-auto max-w-[1380px] space-y-4 px-4 py-20 sm:space-y-5 sm:px-5 sm:py-24 lg:px-10"><div className="h-3 w-24 animate-pulse bg-muted sm:w-28" /><div className="h-20 max-w-3xl animate-pulse bg-muted sm:h-28" /><div className="h-4 max-w-md animate-pulse bg-muted sm:h-5" /></div></div>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="mx-auto max-w-[1380px] px-4 py-20 text-center sm:px-5 sm:py-28 lg:px-10"><div className="mx-auto grid h-12 w-12 place-items-center border border-border text-primary sm:h-14 sm:w-14"><FileText size={18} /></div><h1 className="mt-6 font-display text-3xl text-primary sm:mt-7 sm:text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-7">{body}</p><div className="mt-6 sm:mt-8"><ArrowLink href="/contact">Talk to the factory</ArrowLink></div></div>; }

// ---------- IMAGE UPLOAD COMPONENT ----------
function ImageUpload({ value, onChange, label, previewSize = 'md' }: { value: string; onChange: (url: string) => void; label: string; previewSize?: 'sm' | 'md' | 'lg' }) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const h = previewSize === 'lg' ? 'h-40' : previewSize === 'md' ? 'h-24' : 'h-16';
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') onChange(reader.result); };
    reader.readAsDataURL(file);
  };
  return <div className="space-y-2"><FieldLabel>{label}</FieldLabel>
    <div className="flex gap-1 border-b border-border"><button type="button" onClick={() => setMode('url')} className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] transition-colors ${mode === 'url' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'}`}><span className="flex items-center gap-1"><LinkIcon size={10} /> URL</span></button>
      <button type="button" onClick={() => setMode('file')} className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] transition-colors ${mode === 'file' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'}`}><span className="flex items-center gap-1"><Upload size={10} /> Upload</span></button></div>
    {mode === 'url' ? <input value={value || ''} onChange={e => onChange(e.target.value)} className="editor-input" placeholder="https://example.com/image.jpg" />
      : <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed p-4 transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <ImagePlus size={20} className="text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Click or drag image here</p></div>}
    {value && <div className="relative mt-2 overflow-hidden rounded-sm border border-border"><img src={value} alt="Preview" className={`${h} w-full object-cover`} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><button type="button" onClick={() => onChange('')} className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded bg-black/60 text-white hover:bg-black/80"><X size={10} /></button></div>}
  </div>;
}

// ---------- MULTI-IMAGE UPLOAD ----------
function MultiImageUpload({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === 'string') onChange([...images, reader.result]); };
      reader.readAsDataURL(file);
    });
  };
  return <div className="space-y-2"><FieldLabel>Gallery images ({images.length})</FieldLabel>
    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
      className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed p-3 transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      onClick={() => fileRef.current?.click()}>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
      <ImagePlus size={16} className="text-muted-foreground" />
      <p className="text-[10px] text-muted-foreground">Add images (click or drag)</p></div>
    {images.length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">{images.map((img, i) => <div key={i} className="relative group overflow-hidden rounded-sm border border-border"><img src={img} alt="" className="h-16 w-full object-cover" /><button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></button></div>)}</div>}
  </div>;
}

// ---------- CONTENT PREVIEW MODAL ----------
function ContentPreviewModal({ item, onClose }: { item: ContentRecord; onClose: () => void }) {
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [onClose]);
  const images = recordImages(item);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/40 p-3 sm:p-6" onClick={onClose}>
    <div className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-border p-4 sm:p-6">
        <div><Eyebrow>Preview</Eyebrow><h2 className="mt-1.5 font-display text-2xl text-primary sm:text-3xl">{item.title}</h2></div>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {item.image && <img src={item.image} alt={item.title} className="h-48 w-full object-cover rounded-sm sm:h-64" />}
        <div className="flex flex-wrap gap-2">
          {item.category && <span className="rounded-sm border border-border px-2.5 py-1 font-mono-ui text-[8px] uppercase tracking-[.1em] text-primary">{item.category}</span>}
          <span className={`rounded-sm border px-2.5 py-1 font-mono-ui text-[8px] uppercase tracking-[.1em] ${item.published ? 'border-green-200 bg-green-50 text-green-700' : 'border-muted text-muted-foreground'}`}>{item.published ? 'Published' : 'Draft'}</span>
          {item.featured && <span className="rounded-sm border border-secondary/30 bg-secondary/10 px-2.5 py-1 font-mono-ui text-[8px] uppercase tracking-[.1em] text-secondary">Featured</span>}
        </div>
        <div><FieldLabel>Short description</FieldLabel><p className="mt-1 text-sm text-muted-foreground">{item.shortDescription || 'None'}</p></div>
        <div><FieldLabel>Description</FieldLabel><p className="mt-1 whitespace-pre-line text-sm leading-7 text-foreground">{item.description || 'None'}</p></div>
        {images.length > 1 && <div><FieldLabel>Gallery ({images.length} images)</FieldLabel><div className="mt-2 grid grid-cols-3 gap-2">{images.map((img, i) => <img key={i} src={img} alt="" className="h-20 w-full object-cover rounded-sm border border-border" />)}</div></div>}
        {item.video && <div><FieldLabel>Video</FieldLabel><p className="mt-1 text-sm text-muted-foreground break-all">{item.video}</p></div>}
        {Object.keys(item.meta || {}).length > 0 && <div><FieldLabel>Meta</FieldLabel><div className="mt-1 space-y-1">{Object.entries(item.meta).map(([k, v]) => <div key={k} className="flex gap-2 text-xs"><span className="font-mono text-muted-foreground">{k}:</span><span>{String(v)}</span></div>)}</div></div>}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border"><div><FieldLabel>Display order</FieldLabel><p className="mt-1 text-sm">{item.displayOrder}</p></div><div><FieldLabel>Slug</FieldLabel><p className="mt-1 text-sm font-mono text-muted-foreground">{item.slug}</p></div></div>
      </div>
    </div>
  </div>;
}

// ---------- ADMIN SHELL ----------
function AdminShell() {
  const [, setLocation] = useLocation(); const session = useGetAdminSession(); const logout = useLogoutAdmin(); const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => { if (!session.isLoading && !session.data?.authenticated) setLocation('/admin-login'); }, [session.isLoading, session.data?.authenticated, setLocation]);
  if (session.isLoading) return <LoadingPage />;
  if (!session.data?.authenticated) return null;
  const navLinks = [
    { href: '/admin', label: 'Overview', icon: <LayoutDashboard size={14} /> },
  ];
  return <div className="min-h-[100dvh] bg-muted/40 text-foreground"><aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transition-transform md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-full flex-col"><div className="flex h-[64px] items-center justify-between border-b border-primary-foreground/15 px-5 sm:h-[76px] sm:px-6"><Link href="/admin" data-testid="link-admin-brand"><Mark light /></Link><button type="button" data-testid="button-close-admin-nav" onClick={() => setMobileNav(false)} className="p-1 md:hidden"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-3 sm:p-4"><p className="px-3 pb-2.5 font-mono-ui text-[8px] uppercase tracking-[.13em] text-primary-foreground/40 sm:pb-3 sm:text-[9px] sm:tracking-[.15em]">Workspace</p>{navLinks.map(link => <Link key={link.href} href={link.href} data-testid={`link-admin-${link.label.toLowerCase()}`} className="flex items-center gap-2.5 bg-secondary px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-primary sm:gap-3 sm:py-3 sm:text-[11px]">{link.icon} {link.label}</Link>)}
      <p className="mt-4 px-3 pb-2 font-mono-ui text-[8px] uppercase tracking-[.13em] text-primary-foreground/40 sm:pb-2.5 sm:text-[9px]">Quick links</p>
      <Link href="/?editor=1" className="flex items-center gap-2.5 px-3 py-2 text-[9px] uppercase tracking-[.1em] text-primary-foreground/60 hover:text-secondary sm:py-2.5 sm:text-[10px]"><Pencil size={12} /> Inline editor</Link>
      <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-[9px] uppercase tracking-[.1em] text-primary-foreground/60 hover:text-secondary sm:py-2.5 sm:text-[10px]"><Globe size={12} /> Public site</Link></div>
    <div className="border-t border-primary-foreground/15 p-3 sm:p-4"><button type="button" data-testid="button-admin-logout" onClick={() => logout.mutate(undefined, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() }); setLocation('/admin-login'); } })} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[9px] uppercase tracking-[.1em] text-primary-foreground/60 hover:text-secondary sm:gap-3 sm:py-3 sm:text-[10px] sm:tracking-[.12em]"><LogOut size={14} /> Sign out</button></div></div></aside>{mobileNav && <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileNav(false)} className="fixed inset-0 z-40 bg-primary/30 md:hidden" />}<div className="md:ml-64"><div className="flex h-[64px] items-center gap-3 border-b border-border bg-card px-4 sm:h-[76px] sm:px-5 lg:px-10"><button type="button" data-testid="button-toggle-admin-nav" onClick={() => setMobileNav(!mobileNav)} className="p-2 md:hidden"><Menu size={18} /></button><div className="flex-1" /><span className="font-mono-ui text-[8px] uppercase tracking-[.1em] text-muted-foreground sm:text-[9px]">Admin panel</span></div><main className="p-4 sm:p-5 lg:p-10"><AdminDashboard /></main></div></div>;
}

// ---------- ADMIN DASHBOARD ----------
function AdminDashboard() {
  const [activeCollection, setActiveCollection] = useState<typeof ContentCollection[keyof typeof ContentCollection]>('products');
  const [editor, setEditor] = useState<ContentRecord | 'new' | null>(null);
  const [previewItem, setPreviewItem] = useState<ContentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'featured'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);

  const dashboard = useGetAdminDashboard(); const content = useListAdminContent({ collection: activeCollection }); const health = useHealthCheck();
  const seedSample = useSeedSampleData(); const qc = useQueryClient();
  const bulkAction = useBulkContentAction(); const dupContent = useDuplicateContent();
  const items = content.data || []; const counts = dashboard.data?.counts || {};

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = item.title.toLowerCase().includes(q) || item.shortDescription?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.slug?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterStatus === 'published' && !item.published) return false;
    if (filterStatus === 'draft' && item.published) return false;
    if (filterStatus === 'featured' && !item.featured) return false;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };
  const runBulk = (action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete') => {
    if (!selectedIds.size) return;
    const label = { publish: 'Publish', unpublish: 'Unpublish', feature: 'Feature', unfeature: 'Unfeature', delete: 'Delete' }[action];
    if (!window.confirm(`${label} ${selectedIds.size} items?`)) return;
    bulkAction.mutate({ ids: Array.from(selectedIds), action }, { onSuccess: () => {
      setSelectedIds(new Set()); setShowBulkBar(false);
      qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: activeCollection }) });
      qc.invalidateQueries({ queryKey: getGetSiteQueryKey() });
    }});
  };
  const handleDuplicate = (id: number) => {
    dupContent.mutate(id, { onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: activeCollection }) });
    }});
  };
  const handleSeed = () => { if (window.confirm('Add 1 sample item to each collection?')) { seedSample.mutate(undefined, { onSuccess: (result) => { alert(`Added ${result.added} new sample items.`); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: activeCollection }) }); qc.invalidateQueries({ queryKey: getGetSiteQueryKey() }); } }); } };

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0) || 0;
  const publishedCount = items.filter(i => i.published).length;
  const draftCount = items.filter(i => !i.published).length;
  const featuredCount = items.filter(i => i.featured).length;

  return <div className="space-y-6 sm:space-y-8">
    {/* Header */}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end sm:gap-5">
      <div><Eyebrow>Admin control room</Eyebrow><h1 className="mt-2 font-display text-4xl tracking-[-.04em] text-primary sm:mt-3 sm:text-5xl">Dashboard</h1><p className="mt-2 text-[13px] text-muted-foreground sm:mt-3 sm:text-sm">Manage all content, settings and site data from here.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleSeed} disabled={seedSample.isPending} className="flex items-center justify-center gap-2 border border-secondary bg-secondary/10 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-secondary hover:bg-secondary hover:text-primary sm:px-4 sm:py-3 sm:tracking-[.13em]"><Database size={14} /> {seedSample.isPending ? 'Seeding...' : 'Seed data'}</button>
        <button type="button" onClick={() => setEditor('new')} className="flex items-center justify-center gap-2 bg-primary px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:px-4 sm:py-3 sm:tracking-[.13em]"><Plus size={14} /> Add content</button>
      </div>
    </div>

    {/* Stats grid */}
    <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-5 sm:gap-3">
      <AdminMetric icon={<Images size={16} />} label="Total items" value={String(totalItems)} />
      <AdminMetric icon={<Check size={16} />} label="Published" value={String(publishedCount)} />
      <AdminMetric icon={<FileText size={16} />} label="Drafts" value={String(draftCount)} />
      <AdminMetric icon={<Star size={16} />} label="Featured" value={String(featuredCount)} />
      <AdminMetric icon={<Zap size={16} />} label="API status" value={health.isLoading ? '...' : health.data?.status || 'ok'} />
    </div>

    {/* Main content */}
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="min-w-0 border border-border bg-card">
        {/* Collection tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border p-3 sm:p-4">{collections.map(c => <button type="button" key={c} onClick={() => { setActiveCollection(c); setEditor(null); setSelectedIds(new Set()); setSearchQuery(''); }} className={`rounded-sm px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] transition-colors sm:px-3 sm:text-[10px] sm:tracking-[.12em] ${activeCollection === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-primary'}`}>{c}</button>)}</div>

        {/* Search and filter bar */}
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <div className="relative flex-1"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by title, category, slug..." className="w-full rounded-sm border border-border bg-muted/50 py-2 pl-8 pr-3 text-xs outline-none focus:border-primary" /></div>
          <div className="flex gap-1.5">
            {(['all', 'published', 'draft', 'featured'] as const).map(s => <button key={s} type="button" onClick={() => setFilterStatus(s)} className={`rounded-sm px-2 py-1.5 text-[8px] font-bold uppercase tracking-[.1em] transition-colors sm:text-[9px] ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-primary'}`}>{s}</button>)}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && <div className="flex items-center gap-2 border-b border-secondary bg-secondary/10 px-3 py-2.5 sm:px-4">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-secondary">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button type="button" onClick={() => runBulk('publish')} className="rounded-sm bg-primary px-2 py-1 text-[8px] font-bold uppercase text-primary-foreground hover:bg-primary/80">Publish</button>
          <button type="button" onClick={() => runBulk('unpublish')} className="rounded-sm bg-muted px-2 py-1 text-[8px] font-bold uppercase text-muted-foreground hover:bg-muted/80">Unpublish</button>
          <button type="button" onClick={() => runBulk('feature')} className="rounded-sm bg-secondary/20 px-2 py-1 text-[8px] font-bold uppercase text-secondary hover:bg-secondary/30">Feature</button>
          <button type="button" onClick={() => runBulk('delete')} className="rounded-sm bg-destructive/10 px-2 py-1 text-[8px] font-bold uppercase text-destructive hover:bg-destructive/20">Delete</button>
          <button type="button" onClick={() => { setSelectedIds(new Set()); }} className="p-1 text-muted-foreground hover:text-primary"><X size={12} /></button>
        </div>}

        {/* Content list */}
        <div>
          {content.isLoading ? <AdminListSkeleton /> : content.isError ? <ErrorState onRetry={() => content.refetch()} /> :
            filteredItems.length === 0 ? <div className="p-5 text-center text-[13px] text-muted-foreground sm:p-8">{searchQuery || filterStatus !== 'all' ? 'No items match your search or filter.' : 'No items yet. Add your first entry.'}</div> :
            <div>
              {/* Select all header */}
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 sm:px-5">
                <button type="button" onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary">
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
                <span className="text-[9px] font-bold uppercase tracking-[.1em] text-muted-foreground">Select all ({filteredItems.length})</span>
              </div>
              {filteredItems.map(item => <AdminRow key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={() => toggleSelect(item.id)} onEdit={() => setEditor(item)} onPreview={() => setPreviewItem(item)} onDuplicate={() => handleDuplicate(item.id)} />)}
            </div>}
        </div>
      </section>

      {/* Sidebar */}
      <div className="space-y-5">
        <SiteSettingsCard />
        <StatsEditor />
      </div>
    </div>

    {/* Modals */}
    {editor !== null && <ContentEditor collection={activeCollection} record={editor === 'new' ? null : editor} onClose={() => setEditor(null)} />}
    {previewItem && <ContentPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
  </div>;
}

function AdminMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="border border-border bg-card p-4 sm:p-5"><div className="flex items-center justify-between text-primary"><span className="grid h-7 w-7 place-items-center bg-muted sm:h-8 sm:w-8">{icon}</span></div><p data-testid={`metric-${label.toLowerCase().replace(' ', '-')}`} className="mt-4 font-display text-2xl text-primary sm:mt-5 sm:text-3xl">{value}</p><p className="mt-0.5 font-mono-ui text-[8px] uppercase tracking-[.1em] text-muted-foreground sm:mt-1 sm:text-[9px] sm:tracking-[.12em]">{label}</p></div>; }
function AdminListSkeleton() { return <div className="space-y-px">{[1,2,3].map(item => <div key={item} className="flex gap-3 border-b border-border p-4 sm:gap-4 sm:p-5"><div className="h-12 w-12 animate-pulse bg-muted sm:h-14 sm:w-14" /><div className="flex-1 space-y-2.5"><div className="h-3 w-1/3 animate-pulse bg-muted" /><div className="h-3 w-2/3 animate-pulse bg-muted" /></div></div>)}</div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="border-l-2 border-destructive bg-destructive/10 p-4 sm:p-5"><p className="text-[13px] text-destructive sm:text-sm">We could not load this collection.</p><button type="button" data-testid="button-retry-content" onClick={onRetry} className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-destructive underline sm:mt-4">Try again</button></div>; }

// ---------- ADMIN ROW ----------
function AdminRow({ item, selected, onSelect, onEdit, onPreview, onDuplicate }: { item: ContentRecord; selected: boolean; onSelect: () => void; onEdit: () => void; onPreview: () => void; onDuplicate: () => void }) {
  const remove = useDeleteAdminContent(); const update = useUpdateAdminContent(); const qc = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const deleteItem = () => { setShowActions(false); if (window.confirm(`Delete "${item.title}"?`)) remove.mutate({ id: item.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: item.collection }) }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); } }); };
  const togglePublished = () => update.mutate({ id: item.id, data: { published: !item.published } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: item.collection }) }); qc.invalidateQueries({ queryKey: getGetSiteQueryKey() }); } });
  const toggleFeatured = () => update.mutate({ id: item.id, data: { featured: !item.featured } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection: item.collection }) }); qc.invalidateQueries({ queryKey: getGetSiteQueryKey() }); } });

  return <div data-testid={`row-content-${item.id}`} className={`flex flex-col gap-3 border-b border-border p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${selected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
    <button type="button" onClick={onSelect} className="text-muted-foreground hover:text-primary shrink-0">
      {selected ? <CheckSquare size={14} /> : <Square size={14} />}
    </button>
    <div className="h-12 w-12 shrink-0 overflow-hidden bg-muted sm:h-14 sm:w-14"><img src={recordImage(item)} alt={item.title} className="h-full w-full object-cover mix-blend-multiply" onError={e => { (e.target as HTMLImageElement).src = '/fabric-detail.jpg'; }} /></div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <h3 className="truncate font-display text-lg text-primary sm:text-xl">{item.title}</h3>
        <span className={`rounded-sm px-1.5 py-0.5 font-mono-ui text-[7px] uppercase tracking-[.08em] sm:text-[8px] sm:tracking-[.1em] ${item.published ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{item.published ? 'Published' : 'Draft'}</span>
        {item.featured && <span className="rounded-sm bg-secondary/10 px-1.5 py-0.5 font-mono-ui text-[7px] uppercase tracking-[.08em] text-secondary sm:text-[8px] sm:tracking-[.1em]">Featured</span>}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.shortDescription || 'No description'}</p>
      {item.category && <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Tag size={9} /> {item.category}</p>}
    </div>
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button type="button" onClick={toggleFeatured} title={item.featured ? 'Remove from home' : 'Show on home'} className={`grid h-7 w-7 place-items-center border sm:h-8 sm:w-8 ${item.featured ? 'border-secondary bg-secondary/10 text-secondary' : 'border-border text-muted-foreground hover:border-secondary hover:text-secondary'}`}><Star size={13} fill={item.featured ? 'currentColor' : 'none'} /></button>
      <button type="button" onClick={togglePublished} className="border border-border px-2 py-1.5 font-mono-ui text-[8px] uppercase tracking-[.08em] text-muted-foreground hover:border-primary hover:text-primary sm:px-2.5 sm:py-2 sm:text-[9px] sm:tracking-[.1em]">{item.published ? 'Unpublish' : 'Publish'}</button>
      <button type="button" onClick={onPreview} title="Preview" className="grid h-7 w-7 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary sm:h-8 sm:w-8"><Eye size={13} /></button>
      <button type="button" onClick={onEdit} title="Edit" className="grid h-7 w-7 place-items-center border border-border text-primary hover:bg-primary hover:text-primary-foreground sm:h-8 sm:w-8"><Pencil size={13} /></button>
      <div className="relative">
        <button type="button" onClick={() => setShowActions(!showActions)} className="grid h-7 w-7 place-items-center border border-border text-muted-foreground hover:text-primary sm:h-8 sm:w-8"><ChevronDown size={13} /></button>
        {showActions && <div className="absolute right-0 top-full z-20 mt-1 w-36 border border-border bg-card shadow-lg">
          <button type="button" onClick={() => { setShowActions(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-primary"><Copy size={11} /> Duplicate</button>
          <button type="button" onClick={() => { setShowActions(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-primary"><Pencil size={11} /> Edit</button>
          <button type="button" onClick={deleteItem} disabled={remove.isPending} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-destructive hover:bg-destructive/10"><Trash2 size={11} /> Delete</button>
        </div>}
      </div>
    </div>
  </div>;
}

// ---------- SITE SETTINGS CARD ----------
function SiteSettingsCard() {
  const { data: site } = useGetSite(); const settings = siteSettings(site); const update = useUpdateAdminSite(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SiteSettingsUpdate>({ ...settings });
  useEffect(() => { if (site?.settings) setForm({ ...site.settings }); }, [site?.settings]);
  const submit = (event: FormEvent) => { event.preventDefault(); update.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetSiteQueryKey() }); setSaved(true); setTimeout(() => setSaved(false), 2500); } }); };
  const setField = (field: keyof SiteSettingsUpdate, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return <section className="border border-border bg-card"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4 text-left sm:p-5"><span><Eyebrow>Site settings</Eyebrow><span className="mt-1.5 block font-display text-xl text-primary sm:mt-2 sm:text-2xl">Public details</span><p className="mt-1 text-[11px] text-muted-foreground">Contact info, addresses, hero images</p></span>{open ? <X size={16} /> : <SlidersHorizontal size={16} />}</button>
  {open && <form onSubmit={submit} className="border-t border-border p-4 sm:p-5">
    <div className="space-y-5">
      <div><p className="mb-3 font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px]">General information</p>
        <div className="space-y-3">{(['brandName','location','phone','whatsapp','email','officeAddress','factoryAddress','businessHours','whatsappMessage'] as const).map(field => <label key={field} className="block"><FieldLabel>{field.replace(/[A-Z]/g, match => ` ${match}`).trim()}</FieldLabel><input value={form[field] || ''} onChange={e => setField(field, e.target.value)} className="editor-input mt-1" /></label>)}</div></div>
      <div className="border-t border-border pt-4"><p className="mb-3 font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px]">Hero images</p>
        <div className="space-y-4">{(['heroImage','aboutHeroImage','servicesHeroImage','productsHeroImage','designsHeroImage','excellenceHeroImage','contactHeroImage'] as const).map(field => <ImageUpload key={field} value={form[field] || ''} onChange={v => setField(field, v)} label={field.replace(/([A-Z])/g, ' $1').replace(/^hero/, 'Home hero').trim()} />)}</div></div>
      <div className="border-t border-border pt-4"><p className="mb-3 font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px]">Founder</p>
        <div className="space-y-3">{(['founderName','founderTitle','founderQuote'] as const).map(field => <label key={field} className="block"><FieldLabel>{field.replace(/([A-Z])/g, ' $1').trim()}</FieldLabel><input value={form[field] || ''} onChange={e => setField(field, e.target.value)} className="editor-input mt-1" /></label>)}
        <ImageUpload value={form.founderImage || ''} onChange={v => setField('founderImage', v)} label="Founder photo" /></div></div>
    </div>
    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4 sm:mt-6">
      <button type="submit" data-testid="button-save-site-settings" disabled={update.isPending} className="flex items-center justify-center gap-2 bg-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:py-3">
        {update.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save settings</>}
      </button>
      {saved && <span className="text-[10px] font-bold uppercase tracking-[.1em] text-green-600">Updated successfully</span>}
    </div>
  </form>}</section>;
}

// ---------- STATS EDITOR ----------
function StatsEditor() {
  const { data: site } = useGetSite(); const stats = site?.stats || [];
  const updateStats = useUpdateAdminStats(); const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(stats.map((s: { value: string; label: string; displayOrder: number }) => ({ ...s })));
  useEffect(() => { if (site?.stats) setForm(site.stats.map((s: { value: string; label: string; displayOrder: number }) => ({ ...s }))); }, [site?.stats]);
  const updateStat = (index: number, field: string, value: string) => { const next = [...form]; next[index] = { ...next[index], [field]: value }; setForm(next); };
  const addStat = () => setForm([...form, { value: '', label: '', displayOrder: form.length + 1 }]);
  const removeStat = (index: number) => setForm(form.filter((_, i) => i !== index));
  const saveStats = () => {
    updateStats.mutate(form, { onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetSiteQueryKey() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }});
  };
  return <section className="border border-border bg-card">
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4 text-left sm:p-5">
      <span><Eyebrow>Factory statistics</Eyebrow><span className="mt-1.5 block font-display text-xl text-primary sm:mt-2 sm:text-2xl">Key numbers</span><p className="mt-1 text-[11px] text-muted-foreground">Stats shown on the home page and about page</p></span>
      {open ? <X size={16} /> : <SlidersHorizontal size={16} />}
    </button>
    {open && <div className="border-t border-border p-4 sm:p-5">
      <div className="space-y-3">{form.map((stat: { value: string; label: string; displayOrder: number }, i: number) => <div key={i} className="grid grid-cols-[1fr_1fr_50px_28px] items-end gap-2 rounded-sm border border-border bg-muted/20 p-2.5">
        <label className="block"><FieldLabel>Value</FieldLabel><input value={stat.value} onChange={e => updateStat(i, 'value', e.target.value)} className="editor-input mt-1" placeholder="99+" /></label>
        <label className="block"><FieldLabel>Label</FieldLabel><input value={stat.label} onChange={e => updateStat(i, 'label', e.target.value)} className="editor-input mt-1" placeholder="Machines" /></label>
        <label className="block"><FieldLabel>Order</FieldLabel><input value={String(stat.displayOrder)} onChange={e => updateStat(i, 'displayOrder', e.target.value)} className="editor-input mt-1" /></label>
        <button type="button" onClick={() => removeStat(i)} className="mb-2 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
      </div>)}</div>
      <button type="button" onClick={addStat} className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-primary hover:text-primary/80"><Plus size={12} /> Add stat row</button>
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <button type="button" onClick={saveStats} disabled={updateStats.isPending} className="flex items-center justify-center gap-2 bg-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:py-3">
          {updateStats.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved ? <><Check size={14} /> Stats saved!</> : <><Save size={14} /> Save stats</>}
        </button>
        {saved && <span className="text-[10px] font-bold uppercase tracking-[.1em] text-green-600">Updated successfully</span>}
      </div>
    </div>}
  </section>;
}

// ---------- CONTENT EDITOR (ENHANCED) ----------
function ContentEditor({ collection, record, onClose }: { collection: typeof ContentCollection[keyof typeof ContentCollection]; record: ContentRecord | null; onClose: () => void }) {
  const create = useCreateAdminContent(); const update = useUpdateAdminContent(); const qc = useQueryClient();
  const { data: categories } = useGetCategories({ collection });
  const existingCategories = categories?.[collection] || [];

  const [form, setForm] = useState<ContentInput>({
    collection, slug: record?.slug || '', title: record?.title || '',
    shortDescription: record?.shortDescription || '', description: record?.description || '',
    category: record?.category || '', image: record?.image || '',
    images: record?.images || [], video: record?.video || null,
    published: record?.published ?? false, featured: record?.featured ?? false,
    displayOrder: record?.displayOrder ?? 0, meta: record?.meta || {},
  });
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [metaKey, setMetaKey] = useState('');
  const [metaValue, setMetaValue] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'meta'>('basic');

  const set = (key: keyof ContentInput, value: string | boolean | number | string[] | null | Record<string, unknown>) => setForm(prev => ({ ...prev, [key]: value }));

  const autoSlug = form.title ? form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) : '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.description) return;
    const payload = { ...form, slug: form.slug || autoSlug };
    const finish = () => { qc.invalidateQueries({ queryKey: getListAdminContentQueryKey({ collection }) }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getGetSiteQueryKey() }); onClose(); };
    if (record) { const { collection: _, ...data } = payload; update.mutate({ id: record.id, data: data as ContentUpdate }, { onSuccess: finish }); }
    else create.mutate({ data: payload }, { onSuccess: finish });
  };
  const pending = create.isPending || update.isPending;

  const addMeta = () => { if (metaKey.trim()) { set('meta', { ...(form.meta || {}), [metaKey.trim()]: metaValue }); setMetaKey(''); setMetaValue(''); } };
  const removeMeta = (key: string) => { const m = { ...(form.meta || {}) }; delete m[key]; set('meta', m); };

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-primary/30 p-0 sm:items-center sm:p-5">
    <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto border border-border bg-card shadow-2xl">
      <div className="flex items-start justify-between border-b border-border p-4 sm:p-6">
        <div><Eyebrow>{record ? 'Edit' : 'New'} / {collection}</Eyebrow><h2 className="mt-1.5 font-display text-2xl text-primary sm:text-3xl">{record ? record.title : `Add to ${collection}`}</h2></div>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-border px-4 sm:px-6">
        {([['basic', 'Basic info', Type], ['images', 'Images', ImagePlus], ['meta', 'Meta & SEO', AlignLeft]] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[.1em] transition-colors sm:text-[10px] ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}><Icon size={12} /> {label}</button>)}
      </div>

      <form onSubmit={submit} className="p-4 sm:p-6">
        {activeTab === 'basic' && <div className="space-y-4">
          <label><FieldLabel>Title *</FieldLabel><input required value={form.title} onChange={e => set('title', e.target.value)} className="editor-input mt-1" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><FieldLabel>Slug</FieldLabel><input value={form.slug || ''} onChange={e => set('slug', e.target.value)} className="editor-input mt-1" placeholder={autoSlug || 'auto-generated'} /></label>
            <div>
              <div className="flex items-end justify-between"><FieldLabel>Category</FieldLabel>{!showNewCategory && <button type="button" onClick={() => setShowNewCategory(true)} className="text-[8px] font-bold uppercase tracking-[.1em] text-primary hover:text-primary/80">+ New</button>}</div>
              {showNewCategory ? <div className="mt-1 flex gap-1.5"><input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category name" className="editor-input flex-1" /><button type="button" onClick={() => { if (newCategory.trim()) { set('category', newCategory.trim()); setShowNewCategory(false); setNewCategory(''); } }} className="shrink-0 rounded bg-primary px-2 text-[9px] font-bold text-primary-foreground">Add</button><button type="button" onClick={() => setShowNewCategory(false)} className="shrink-0 text-[9px] text-muted-foreground">Cancel</button></div>
                : <select value={form.category || ''} onChange={e => set('category', e.target.value)} className="editor-input mt-1"><option value="">Select category...</option>{existingCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>}
            </div>
          </div>
          <label><FieldLabel>Short description *</FieldLabel><input required value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} className="editor-input mt-1" /></label>
          <label><FieldLabel>Description *</FieldLabel><textarea required rows={6} value={form.description} onChange={e => set('description', e.target.value)} className="editor-input mt-1 resize-y" /></label>
          {collection === 'machinery' && <label><FieldLabel>What it is used for</FieldLabel><input value={(form.meta as Record<string, unknown>)?.application as string || ''} onChange={e => set('meta', { ...(form.meta || {}), application: e.target.value })} className="editor-input mt-1" placeholder="e.g. High-volume production of plain-weave fabric" /></label>}
          <label><FieldLabel>Video URL (optional)</FieldLabel><input value={form.video || ''} onChange={e => set('video', e.target.value || null)} className="editor-input mt-1" placeholder="https://youtube.com/... or direct video URL" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><FieldLabel>Display order</FieldLabel><input type="number" value={form.displayOrder ?? 0} onChange={e => set('displayOrder', Number(e.target.value))} className="editor-input mt-1" /></label>
            <div className="flex items-end gap-4"><label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={form.published ?? false} onChange={e => set('published', e.target.checked)} className="accent-primary" /><span className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground">Published</span></label><label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={form.featured ?? false} onChange={e => set('featured', e.target.checked)} className="accent-secondary" /><span className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground">Featured</span></label></div>
          </div>
        </div>}

        {activeTab === 'images' && <div className="space-y-5">
          <ImageUpload value={form.image || ''} onChange={v => set('image', v)} label="Primary image" previewSize="lg" />
          <MultiImageUpload images={form.images || []} onChange={v => set('images', v)} />
        </div>}

        {activeTab === 'meta' && <div className="space-y-4">
          <div><FieldLabel>Custom meta fields</FieldLabel>
            <div className="mt-2 space-y-2">{Object.entries(form.meta || {}).map(([k, v]) => <div key={k} className="flex items-center gap-2 rounded-sm border border-border bg-muted/30 px-2.5 py-1.5"><span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">{k}</span><span className="flex-1 truncate text-xs">{String(v)}</span><button type="button" onClick={() => removeMeta(k)} className="text-muted-foreground hover:text-destructive"><Trash2 size={10} /></button></div>)}</div>
            <div className="mt-2 flex gap-2"><input value={metaKey} onChange={e => setMetaKey(e.target.value)} placeholder="Key" className="editor-input flex-1" /><input value={metaValue} onChange={e => setMetaValue(e.target.value)} placeholder="Value" className="editor-input flex-1" /><button type="button" onClick={addMeta} className="shrink-0 rounded bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground">Add</button></div>
          </div>
        </div>}

        <div className="mt-6 flex gap-2 border-t border-border pt-4">
          <button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 bg-primary px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:py-3"><Save size={14} /> {pending ? 'Saving...' : record ? 'Save changes' : 'Create entry'}</button>
          <button type="button" onClick={onClose} className="border border-border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground hover:text-primary sm:py-3">Cancel</button>
        </div>
      </form>
    </div>
  </div>;
}

function FieldLabel({ children }: { children: ReactNode }) { return <span className="font-mono-ui text-[9px] uppercase tracking-[.13em] text-muted-foreground">{children}</span>; }

function Router() {
  const [location] = useLocation();
  const { data: session } = useGetAdminSession();
  const prevLocation = useRef(location);
  const isAdminArea = (p: string) => p.startsWith('/admin');
  useEffect(() => {
    const from = prevLocation.current;
    const to = location;
    prevLocation.current = location;
    const wasInAdminArea = isAdminArea(from) && !isAdminArea(to);
    const wasAdminLogin = from === '/admin-login' && !isAdminArea(to);
    if ((wasInAdminArea || wasAdminLogin) && session?.authenticated) {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(() => queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() }))
        .catch(() => {});
    }
  }, [location, session?.authenticated]);
  useEffect(() => {
    if (!isAdminArea(location)) return;
    const handler = () => { if (navigator.sendBeacon) navigator.sendBeacon('/api/auth/logout', new Blob([])); else fetch('/api/auth/logout', { method: 'POST', credentials: 'include', keepalive: true }); };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [location]);
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={HomePage} /><Route path="/about" component={AboutPage} /><Route path="/services" component={ServicesPage} /><Route path="/services/:slug"><DetailPage kind="services" /></Route><Route path="/products" component={ProductsPage} /><Route path="/products/:slug"><DetailPage kind="products" /></Route><Route path="/designs" component={DesignsPage} /><Route path="/designs/:slug"><DetailPage kind="designs" /></Route><Route path="/excellence" component={ExcellencePage} /><Route path="/machinery/:slug"><DetailPage kind="machinery" /></Route><Route path="/contact" component={ContactPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} /><Route path="/admin-login" component={AdminLoginPage} /><Route path="/admin" component={AdminShell} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}
function App() { useScrollReveal(); return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;