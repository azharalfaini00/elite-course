import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  INITIAL_FAQS,
  INITIAL_GALLERY_ITEMS,
  INITIAL_PROGRAM_LEVELS,
  INITIAL_PROGRAMS,
  INITIAL_REGISTRATION_PERIODS,
  INITIAL_SITE_SETTINGS,
  INITIAL_TUTORS,
} from '../data/seedData';
import { fetchPublicCatalog } from '../lib/apiService';
import {
  Certificate,
  Discount,
  FaqItem,
  GalleryItem,
  PaymentMethod,
  Program,
  ProgramLevel,
  ProgramMaterial,
  RegistrationPeriod,
  SiteSettings,
  Tutor,
} from '../types/elite';

interface SiteDataContextValue {
  loading: boolean;
  error: string | null;
  isCatalogReady: boolean;
  isSeededInFirestore: boolean;
  siteSettings: SiteSettings;
  programs: Program[];
  programLevels: ProgramLevel[];
  programMaterials: ProgramMaterial[];
  registrationPeriods: RegistrationPeriod[];
  discounts: Discount[];
  paymentMethods: PaymentMethod[];
  tutors: Tutor[];
  certificates: Certificate[];
  galleryItems: GalleryItem[];
  faqs: FaqItem[];
  reloadCatalog: () => Promise<void>;
}

const CATALOG_CACHE_KEY = 'elite_public_catalog_cache_v1';

function getCachedCatalog() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SiteDataContext = createContext<SiteDataContextValue | undefined>(undefined);

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const initialCache = getCachedCatalog();

  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);
  const [isSeededInFirestore, setIsSeededInFirestore] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    initialCache?.siteSettings || {
      ...INITIAL_SITE_SETTINGS,
      id: 'main',
    }
  );
  const [programs, setPrograms] = useState<Program[]>(
    initialCache?.programs || INITIAL_PROGRAMS.map((p) => ({ ...p.data, id: p.id }))
  );
  const [programLevels, setProgramLevels] = useState<ProgramLevel[]>(
    initialCache?.programLevels || INITIAL_PROGRAM_LEVELS.map((l) => ({ ...l.data, id: l.id }))
  );
  const [programMaterials, setProgramMaterials] = useState<ProgramMaterial[]>(
    initialCache?.programMaterials || []
  );
  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>(
    initialCache?.registrationPeriods || INITIAL_REGISTRATION_PERIODS.map((p) => ({ ...p.data, id: p.id }))
  );
  const [discounts, setDiscounts] = useState<Discount[]>(initialCache?.discounts || []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialCache?.paymentMethods || []);
  const [tutors, setTutors] = useState<Tutor[]>(
    initialCache?.tutors || INITIAL_TUTORS.map((t) => ({ ...t.data, id: t.id }))
  );
  const [certificates, setCertificates] = useState<Certificate[]>(initialCache?.certificates || []);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(
    initialCache?.galleryItems || INITIAL_GALLERY_ITEMS.map((g) => ({ ...g.data, id: g.id }))
  );
  const [faqs, setFaqs] = useState<FaqItem[]>(
    initialCache?.faqs || INITIAL_FAQS.map((f) => ({ ...f.data, id: f.id }))
  );

  const reloadCatalog = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPublicCatalog();
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
        } catch {
          // ignore quota error
        }
      }
      setIsSeededInFirestore(data.isSeededInFirestore);
      setSiteSettings(data.siteSettings);
      setPrograms(data.programs);
      setProgramLevels(data.programLevels);
      setProgramMaterials(data.programMaterials);
      setRegistrationPeriods(data.registrationPeriods);
      setDiscounts(data.discounts);
      setPaymentMethods(data.paymentMethods);
      setTutors(data.tutors);
      setCertificates(data.certificates);
      setGalleryItems(data.galleryItems);
      setFaqs(data.faqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data website dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  return (
    <SiteDataContext.Provider
      value={{
        loading,
        error,
        isCatalogReady: isSeededInFirestore,
        isSeededInFirestore,
        siteSettings,
        programs,
        programLevels,
        programMaterials,
        registrationPeriods,
        discounts,
        paymentMethods,
        tutors,
        certificates,
        galleryItems,
        faqs,
        reloadCatalog,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData harus digunakan di dalam SiteDataProvider.');
  return ctx;
}
