import { useEffect, useState, useCallback } from "react";
import { Header } from "../layout/Header";
import { StatusBadge } from "../shared/StatusBadge";
import { PlatformIcon } from "../shared/PlatformIcon";
import { ContentCalendar } from "./ContentCalendar";
import { LinkedInPreview } from "./LinkedInPreview";
import { CarouselCreator } from "./CarouselCreator";
import { getDraftDates, getDrafts, publishPost, approvePost, editPostBody, generateCarouselSlides } from "../../api/client";
import type { DraftDate, Post, ContentStatusType } from "../../types";
import type { CarouselSlide } from "./LinkedInPreview";
import { Check, Pencil, RotateCcw, Send, ChevronDown, Image, Clock, Hash, X, Save, Eye, LayoutGrid, Loader2 } from "lucide-react";

export function ContentDashboard() {
  const [dates, setDates] = useState<DraftDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const fetchDates = useCallback(async () => {
    try {
      const d = await getDraftDates();
      setDates(d);
      if (d.length > 0 && !selectedDate) {
        setSelectedDate(d[0]!.date);
      }
    } catch (e) {
      console.error("Failed to fetch dates:", e);
    }
  }, [selectedDate]);

  const fetchPosts = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const p = await getDrafts(selectedDate);
      setPosts(p);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchDates(); }, [fetchDates]);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePublish = async (post: Post, carouselData?: { slides: CarouselSlide[]; title?: string }) => {
    const status = post.statusInfo?.status;
    if (status === "published") {
      alert("Este post ya fue publicado.");
      return;
    }
    const isCarousel = !!carouselData?.slides?.length;
    const confirmMsg = isCarousel
      ? `Publicar POST ${post.number} como CAROUSEL (${carouselData.slides.length} slides) en ${post.platform}?`
      : `Publicar POST ${post.number} en ${post.platform}?`;
    if (!confirm(confirmMsg)) return;
    setPublishing(post.number);
    try {
      await publishPost(
        selectedDate,
        post.number,
        post.platform,
        isCarousel ? carouselData.slides : undefined,
        isCarousel ? carouselData.title : undefined,
      );
      alert(`POST ${post.number} publicado en ${post.platform}${isCarousel ? " como carousel" : ""}`);
      fetchPosts();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setPublishing(null);
    }
  };

  const handleApprove = async (post: Post) => {
    try {
      await approvePost(selectedDate, post.number, post.platform);
      fetchPosts();
    } catch (e) {
      alert(`Error al aprobar: ${e}`);
    }
  };

  const handleSaveEdit = async (post: Post, newBody: string) => {
    try {
      await editPostBody(selectedDate, post.number, newBody, post.platform);
      fetchPosts();
    } catch (e) {
      alert(`Error al guardar: ${e}`);
    }
  };

  const platformCounts = posts.reduce<Record<string, number>>((acc, p) => {
    const key = p.platform.toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header view="content" onRefresh={() => { fetchDates(); fetchPosts(); }} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {/* Calendar strip */}
        <ContentCalendar
          dates={dates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Total Posts" value={posts.length} />
          {Object.entries(platformCounts).map(([platform, count]) => (
            <SummaryCard key={platform} label={platform} value={count} />
          ))}
        </div>

        {/* Post cards */}
        {loading ? (
          <div className="text-center text-el-low body-sm py-20">Cargando...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-el-low body-sm py-20">
            No hay drafts para {selectedDate}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <DraftCard
                key={post.number}
                post={post}
                expanded={expandedPost === post.number}
                onToggle={() => setExpandedPost(expandedPost === post.number ? null : post.number)}
                onPublish={(carouselData) => handlePublish(post, carouselData)}
                onApprove={() => handleApprove(post)}
                onSaveEdit={(body) => handleSaveEdit(post, body)}
                isPublishing={publishing === post.number}
                date={selectedDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-outline rounded-xl p-4 text-center shadow-low">
      <div className="amount-md text-green-darker-ext">{value}</div>
      <div className="overline-sm text-el-low uppercase mt-1 capitalize">{label}</div>
    </div>
  );
}

interface DraftCardProps {
  post: Post;
  expanded: boolean;
  onToggle: () => void;
  onPublish: (carouselData?: { slides: CarouselSlide[]; title?: string }) => void;
  onApprove: () => void;
  onSaveEdit: (body: string) => void;
  isPublishing: boolean;
  date: string;
}

function DraftCard({ post, expanded, onToggle, onPublish, onApprove, onSaveEdit, isPublishing, date }: DraftCardProps) {
  const [imgError, setImgError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[] | null>(null);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);

  // Reset image error state when date or post changes
  useEffect(() => { setImgError(false); }, [date, post.number]);

  const status: ContentStatusType = post.statusInfo?.status ?? "draft";
  const isPublished = status === "published";
  const isApproved = status === "approved";
  const displayBody = post.statusInfo?.bodyOverride ?? post.body;
  const hasOverride = !!post.statusInfo?.bodyOverride;

  const startEdit = () => {
    setEditBody(displayBody);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditBody("");
  };

  const saveEdit = () => {
    onSaveEdit(editBody);
    setEditing(false);
  };

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden shadow-low hover:shadow-mid transition-shadow ${
      isPublished ? "border-success-base/40" : isApproved ? "border-warning-base/40" : "border-outline"
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer" onClick={onToggle}>
        <PlatformIcon platform={post.platform} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="title-sm text-el-high">POST {post.number}</span>
            <span className="label-lg text-el-low">{post.type}</span>
            <StatusBadge status={status} />
            {hasOverride && (
              <span className="label-md text-warning-base px-1.5 py-0.5 rounded bg-warning-lighter/30">editado</span>
            )}
          </div>
          <p className="label-lg text-el-mid truncate mt-0.5">{post.headerDescription}</p>
        </div>
        <div className="flex items-center gap-2 label-lg text-el-low shrink-0">
          {isPublished && post.statusInfo?.publishedAt && (
            <span className="label-md text-success-base">
              {new Date(post.statusInfo.publishedAt).toLocaleDateString()}
            </span>
          )}
          {post.postingTime && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.postingTime}</span>
          )}
          {post.image && (
            <span className="flex items-center gap-1"><Image className="w-3 h-3" />img</span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-outline px-5 py-4 space-y-4">
          {/* Carousel Creator (full-width when active) */}
          {showCarousel ? (
            generatingCarousel ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-green-darker" />
                <p className="body-sm text-el-mid">Generando carousel...</p>
              </div>
            ) : carouselSlides ? (
              <CarouselCreator
                initialSlides={carouselSlides}
                postText={displayBody}
                platform={post.platform}
                onClose={() => { setShowCarousel(false); setCarouselSlides(null); }}
              />
            ) : null
          ) : (
            <>
              {/* Content + Preview side by side */}
              <div className={`grid gap-4 ${showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
                {/* Left: Body / Edit + Image */}
                <div className={showPreview ? "" : "lg:col-span-2"}>
                  <div className="space-y-4">
                    {editing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full bg-surface-accent border border-green-darker/40 rounded-md p-4 body-sm text-el-high resize-none min-h-[200px] max-h-80 focus:outline-none focus:ring-1 focus:ring-green-darker custom-scrollbar"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="btn-sm btn-primary contained">
                            <Save className="w-3.5 h-3.5" /> Guardar
                          </button>
                          <button onClick={cancelEdit} className="btn-sm ghost">
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface-accent border border-outline rounded-md p-4 body-sm text-el-mid whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar">
                        {displayBody}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Preview or Image */}
                {showPreview ? (
                  <div className="flex justify-center">
                    <LinkedInPreview
                      content={editing ? editBody : displayBody}
                      imageUrl={
                        post.image && !imgError
                          ? `/api/images/${date}/${String(post.number).padStart(2, "0")}`
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {post.image ? (
                      <>
                        {!imgError && (
                          <img
                            key={`${date}-${post.number}`}
                            src={`/api/images/${date}/${String(post.number).padStart(2, "0")}`}
                            alt={`Post ${post.number}`}
                            className="w-full rounded-lg border border-outline"
                            onError={() => setImgError(true)}
                          />
                        )}
                        <p className="label-lg text-el-low text-center">{post.image.dimensions} — {post.image.style}</p>
                      </>
                    ) : (
                      <div className="w-full h-40 bg-overlay border border-outline rounded-lg flex items-center justify-center text-el-low label-lg">
                        Sin imagen
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                {post.pillar && (
                  <span className="label-lg-w-semibold px-2.5 py-1 rounded-md bg-green-lighter-ext text-green-darker-ext border border-green-lighter">
                    {post.pillar}
                  </span>
                )}
                {post.series && (
                  <span className="label-lg px-2.5 py-1 rounded-md bg-overlay text-el-mid">
                    {post.series}
                  </span>
                )}
              </div>

              {post.hashtags && (
                <p className="label-lg text-green-darker flex items-center gap-1">
                  <Hash className="w-3 h-3" />{post.hashtags}
                </p>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline">
            {/* Publish */}
            <button
              onClick={() => {
                if (showCarousel && carouselSlides && carouselSlides.length > 0) {
                  onPublish({ slides: carouselSlides, title: carouselSlides[0]?.title });
                } else {
                  onPublish();
                }
              }}
              disabled={isPublishing || isPublished}
              className={`btn-sm ${isPublished ? "ghost text-success-base" : "btn-primary contained"}`}
            >
              {isPublishing ? (
                <><RotateCcw className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
              ) : isPublished ? (
                <><Check className="w-3.5 h-3.5" /> Publicado</>
              ) : showCarousel && carouselSlides ? (
                <><Send className="w-3.5 h-3.5" /> Publicar Carousel</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Publicar</>
              )}
            </button>

            {/* Approve */}
            {!isPublished && (
              <button
                onClick={onApprove}
                disabled={isApproved}
                className={`btn-sm ${isApproved ? "ghost text-warning-base" : "outlined"}`}
              >
                <Check className="w-3.5 h-3.5" />
                {isApproved ? "Aprobado" : "Aprobar"}
              </button>
            )}

            {/* Edit */}
            {!isPublished && !editing && !showCarousel && (
              <button onClick={startEdit} className="btn-sm ghost">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            )}

            {/* Preview toggle */}
            {!showCarousel && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`btn-sm ${showPreview ? "outlined ring-1 ring-green-darker/30" : "ghost"}`}
              >
                <Eye className="w-3.5 h-3.5" /> {showPreview ? "Hide Preview" : "Preview"}
              </button>
            )}

            {/* Carousel toggle */}
            {post.platform.toLowerCase().includes("linkedin") && (
              <button
                onClick={async () => {
                  if (showCarousel) {
                    setShowCarousel(false);
                    return;
                  }
                  // Generate carousel slides via AI
                  setGeneratingCarousel(true);
                  setShowPreview(false);
                  setShowCarousel(true);
                  try {
                    const result = await generateCarouselSlides(displayBody, post.platform);
                    const mapped: CarouselSlide[] = result.slides.map((s) => ({
                      title: s.headline,
                      body: s.body,
                      slideNumber: s.slideNumber,
                    }));
                    setCarouselSlides(mapped);
                  } catch (e: any) {
                    alert(`Error generando carousel: ${e.message}`);
                    setShowCarousel(false);
                  } finally {
                    setGeneratingCarousel(false);
                  }
                }}
                disabled={generatingCarousel}
                className={`btn-sm ${showCarousel ? "outlined ring-1 ring-green-darker/30" : "ghost"} disabled:opacity-50`}
              >
                {generatingCarousel ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</>
                ) : (
                  <><LayoutGrid className="w-3.5 h-3.5" /> {showCarousel ? "Cerrar Carousel" : "Carousel"}</>
                )}
              </button>
            )}

            {/* Regenerate — placeholder for Phase 4+ */}
            {!isPublished && !showCarousel && (
              <button className="btn-sm ghost" disabled>
                <RotateCcw className="w-3.5 h-3.5" /> Regenerar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
