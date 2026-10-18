import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Files chosen on the New Audit screen, kept for the session so the claim tools can reuse
 * them instead of asking the user to upload the same PDFs again. */
export interface Uploads {
  medical: File[];
  insurance: File[];
  mainBill: number;
  mainPolicy: number;
  claimType: "reimbursement" | "cashless" | "day_care";
  setMedical: (files: File[]) => void;
  setInsurance: (files: File[]) => void;
  setMainBill: (index: number) => void;
  setMainPolicy: (index: number) => void;
  setClaimType: (type: Uploads["claimType"]) => void;
  clear: () => void;
  mainPolicyFile: File | undefined;
}

const UploadsContext = createContext<Uploads | null>(null);

export function UploadsProvider({ children }: { children: ReactNode }) {
  const [medical, setMedicalState] = useState<File[]>([]);
  const [insurance, setInsuranceState] = useState<File[]>([]);
  const [mainBill, setMainBill] = useState(0);
  const [mainPolicy, setMainPolicy] = useState(0);
  const [claimType, setClaimType] = useState<Uploads["claimType"]>("reimbursement");

  const value = useMemo<Uploads>(
    () => ({
      medical,
      insurance,
      mainBill,
      mainPolicy,
      claimType,
      setMedical: (files) => {
        setMedicalState(files);
        setMainBill(0);
      },
      setInsurance: (files) => {
        setInsuranceState(files);
        setMainPolicy(0);
      },
      setMainBill,
      setMainPolicy,
      setClaimType,
      clear: () => {
        setMedicalState([]);
        setInsuranceState([]);
        setMainBill(0);
        setMainPolicy(0);
      },
      mainPolicyFile: insurance[mainPolicy],
    }),
    [medical, insurance, mainBill, mainPolicy, claimType],
  );
  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads(): Uploads {
  const ctx = useContext(UploadsContext);
  if (!ctx) throw new Error("useUploads must be used inside UploadsProvider");
  return ctx;
}
