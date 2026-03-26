import { useState, useRef } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, RefreshCw, Download, Send } from "lucide-react";
import { LinkedInPreview } from "./LinkedInPreview";
import type { CarouselSlide } from "./LinkedInPreview";
import { generateCarouselSlides } from "../../api/client";

function renumber(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((s, i) => ({ ...s, slideNumber: i + 1 }));
}

interface CarouselCreatorProps {
  /** Pre-generated slides from the API */
  initialSlides: CarouselSlide[];
  /** Original post body text */
  postText: string;
  /** Platform for regeneration calls */
  platform?: string;
  onClose?: () => void;
}

export function CarouselCreator({
  initialSlides,
  postText,
  platform,
  onClose,
}: CarouselCreatorProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [introText, setIntroText] = useState(
    postText.length > 200 ? postText.slice(0, 200).trimEnd() + "..." : postText
  );
  const [regenerating, setRegenerating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const instructionsRef = useRef<HTMLInputElement>(null);

  const addSlide = () => {
    if (slides.length >= 10) return;
    setSlides(renumber([...slides, { title: "", body: "", slideNumber: slides.length + 1 }]));
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    setSlides(renumber(next));
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setSlides(renumber(next));
  };

  const updateSlide = (idx: number, field: "title" | "body", value: string) => {
    const next = slides.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    setSlides(next);
  };

  const handleRegenerate = async (customInstructions?: string) => {
    const instr = customInstructions || instructions;
    setRegenerating(true);
    try {
      // Send current slides + instructions for refinement
      const currentSlides = instr
        ? slides.map((s) => ({ headline: s.title, body: s.body, slideNumber: s.slideNumber }))
        : undefined;
      const result = await generateCarouselSlides(postText, platform, instr || undefined, currentSlides);
      const mapped: CarouselSlide[] = result.slides.map((s) => ({
        title: s.headline,
        body: s.body,
        slideNumber: s.slideNumber,
      }));
      setSlides(mapped);
      setInstructions("");
    } catch (e: any) {
      alert(`Error al regenerar: ${e.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleInstructionSubmit = () => {
    if (!instructions.trim() || regenerating) return;
    handleRegenerate(instructions);
  };

  const handleDownloadPptx = () => {
    alert("Descarga de PPTX disponible proximamente.");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Editor Panel */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="title-lg text-el-high">Carousel Editor</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-sm outlined flex items-center gap-1.5 disabled:opacity-50"
            >
              {regenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerando...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5" /> Regenerar</>
              )}
            </button>
            <button
              onClick={handleDownloadPptx}
              className="btn-sm outlined flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Descargar PPTX
            </button>
            {onClose && (
              <button onClick={onClose} className="btn-sm ghost">
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Instructions input for refinement */}
        <div className="flex gap-2">
          <input
            ref={instructionsRef}
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInstructionSubmit()}
            placeholder="Ej: 'Cambiá el titulo del slide 3', 'Sacá las palabras técnicas', 'Hacelo mas informal'..."
            disabled={regenerating}
            className="flex-1 bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker disabled:opacity-50 placeholder:text-el-low/50"
          />
          <button
            onClick={handleInstructionSubmit}
            disabled={!instructions.trim() || regenerating}
            className="px-3 py-2 bg-green-darker text-white rounded-md hover:bg-green-darker/90 disabled:opacity-40 transition flex items-center gap-1.5"
          >
            {regenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Intro text (auto-filled, editable) */}
        <div>
          <label className="label-md text-el-low uppercase block mb-1">Texto del Post</label>
          <textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="Texto que acompaña el carousel en LinkedIn..."
            className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high resize-none h-20 focus:outline-none focus:ring-1 focus:ring-green-darker custom-scrollbar"
          />
        </div>

        {/* Slide editor list */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className="bg-surface border border-outline rounded-lg p-3 space-y-2 shadow-low"
            >
              <div className="flex items-center justify-between">
                <span className="label-lg-w-semibold text-el-high">
                  Slide {slide.slideNumber}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSlide(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-el-low hover:bg-overlay disabled:opacity-30 cursor-pointer disabled:cursor-default transition"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSlide(idx, 1)}
                    disabled={idx === slides.length - 1}
                    className="p-1 rounded text-el-low hover:bg-overlay disabled:opacity-30 cursor-pointer disabled:cursor-default transition"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeSlide(idx)}
                    disabled={slides.length <= 1}
                    className="p-1 rounded text-error-base hover:bg-error-lighter-ext disabled:opacity-30 cursor-pointer disabled:cursor-default transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={slide.title}
                onChange={(e) => updateSlide(idx, "title", e.target.value)}
                placeholder="Headline..."
                className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high font-semibold focus:outline-none focus:ring-1 focus:ring-green-darker"
              />
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide(idx, "body", e.target.value)}
                placeholder="Contenido del slide..."
                rows={2}
                className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high resize-none focus:outline-none focus:ring-1 focus:ring-green-darker custom-scrollbar"
              />
            </div>
          ))}
        </div>

        {slides.length < 10 && (
          <button
            onClick={addSlide}
            className="btn-sm outlined w-full flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Slide ({slides.length}/10)
          </button>
        )}
      </div>

      {/* Preview Panel */}
      <div className="lg:w-[400px] shrink-0">
        <label className="label-md text-el-low uppercase block mb-2">LinkedIn Preview</label>
        <div className="sticky top-4">
          <LinkedInPreview
            content={introText || "Tu texto de carousel aparecerá aquí..."}
            carouselSlides={slides}
          />
        </div>
      </div>
    </div>
  );
}
