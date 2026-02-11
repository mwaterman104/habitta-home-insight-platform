import { FileUp, Camera } from "lucide-react";
import type { HomeConfidenceResult } from "@/services/homeConfidence";

interface MissingDocumentationProps {
  nextGain: HomeConfidenceResult['nextGain'];
  onUploadDoc: () => void;
  onUploadPhoto: () => void;
}

export function MissingDocumentation({ nextGain, onUploadDoc, onUploadPhoto }: MissingDocumentationProps) {
  const photoDelta = nextGain?.delta ?? null;
  const showPhotoBoost = photoDelta !== null && photoDelta >= 2;
  const docBoost = 2; // Fixed estimate for permit/invoice signal

  return (
    <section className="w-full p-5 bg-habitta-stone/5 border border-habitta-stone/15 rounded-sm">
      <h3 className="text-habitta-charcoal font-bold text-body-sm uppercase tracking-tightest mb-2">
        Missing Documentation
      </h3>

      <p className="text-habitta-stone text-meta leading-relaxed mb-5">
        {nextGain
          ? `Photos, service records, and date confirmations strengthen your home's record. Next step: ${nextGain.action.toLowerCase()}.`
          : 'Upload photos or confirm system details to strengthen your home record.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onUploadDoc}
          className="flex flex-col items-center justify-center gap-1 py-3 px-4 bg-habitta-slate text-habitta-ivory rounded-sm transition-colors hover:bg-habitta-slate/90"
        >
          <span className="flex items-center gap-2 text-meta font-bold uppercase tracking-wider">
            <FileUp size={16} strokeWidth={2} />
            Upload Doc
          </span>
          {nextGain && (
            <span className="text-[10px] text-habitta-ivory/70 tracking-wide">
              (+{docBoost}% confidence)
            </span>
          )}
        </button>

        <button
          onClick={onUploadPhoto}
          className="flex flex-col items-center justify-center gap-1 py-3 px-4 bg-habitta-stone text-habitta-ivory rounded-sm transition-colors hover:bg-habitta-charcoal"
        >
          <span className="flex items-center gap-2 text-meta font-bold uppercase tracking-wider">
            <Camera size={16} strokeWidth={2} />
            Upload Photo
          </span>
          {showPhotoBoost && (
            <span className="text-[10px] text-habitta-ivory/70 tracking-wide">
              (+{photoDelta}% confidence)
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
