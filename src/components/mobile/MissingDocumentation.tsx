import { FileUp, Camera } from "lucide-react";
import type { HomeConfidenceResult } from "@/services/homeConfidence";

interface MissingDocumentationProps {
  nextGain: HomeConfidenceResult['nextGain'];
  onUploadDoc: () => void;
  onUploadPhoto: () => void;
}

export function MissingDocumentation({ nextGain, onUploadDoc, onUploadPhoto }: MissingDocumentationProps) {
  return (
    <section className="w-full p-5 bg-habitta-stone/5 border border-habitta-stone/15 rounded-sm">
      <h3 className="text-habitta-charcoal font-bold text-body-sm uppercase tracking-tightest mb-2">
        Missing Documentation
      </h3>

      <p className="text-habitta-stone text-meta leading-relaxed mb-5">
        {nextGain
          ? `Providing records strengthens timeline accuracy. Next step: ${nextGain.action.toLowerCase()}.`
          : 'Upload permits, invoices, or photos to improve data confidence.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onUploadDoc}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-habitta-slate text-habitta-ivory rounded-sm text-meta font-bold uppercase tracking-wider transition-colors hover:bg-habitta-slate/90"
        >
          <FileUp size={16} strokeWidth={2} />
          Upload Doc
        </button>

        <button
          onClick={onUploadPhoto}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-habitta-stone text-habitta-ivory rounded-sm text-meta font-bold uppercase tracking-wider transition-colors hover:bg-habitta-charcoal"
        >
          <Camera size={16} strokeWidth={2} />
          Upload Photo
        </button>
      </div>
    </section>
  );
}
