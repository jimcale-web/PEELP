import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Lock,
  Menu,
  Video,
  X,
} from 'lucide-react';
import api from '../../services/api';
import '../../styles/LessonPlayer.css';

// The <video> tag can only play direct media files (.mp4/.webm/etc). Links to a
// YouTube/Vimeo watch page aren't playable media — they must be converted to the
// site's embeddable player URL and rendered in an <iframe> instead.
function getEmbedVideoUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId = parsed.pathname === '/watch' ? parsed.searchParams.get('v') : parsed.pathname.split('/').pop();
      return videoId ? getYouTubeEmbedUrl(videoId) : null;
    }
    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      return videoId ? getYouTubeEmbedUrl(videoId) : null;
    }
    if (host === 'vimeo.com') {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(videoId: string): string {
  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  embedUrl.search = new URLSearchParams({
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
  }).toString();
  return embedUrl.toString();
}

interface StudentResource {
  id: string;
  type: string;
  url: string | null;
  isFree: boolean;
  order: number;
  locked: boolean;
}

interface StudentLesson {
  id: string;
  title: string;
  description: string | null;
  order: number;
  resources: StudentResource[];
}

interface StudentSection {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: StudentLesson[];
}

interface StudentCourseSections {
  sections: StudentSection[];
  hasAccess: boolean;
  canTrackProgress: boolean;
  completedLessonIds: string[];
}

interface StudentCourse {
  id: string;
  title: string;
  description: string | null;
  instructor: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

async function fetchCourse(courseId: string): Promise<{ course: StudentCourse; hasAccess: boolean }> {
  const res = await api.get<{ course: StudentCourse; hasAccess: boolean }>(`/student/courses/${courseId}`);
  return res.data;
}

async function fetchSections(courseId: string): Promise<StudentCourseSections> {
  const res = await api.get<StudentCourseSections>(`/student/courses/${courseId}/sections`);
  return res.data;
}

export default function LessonPlayer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState('');

  const {
    data: courseData,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => fetchCourse(courseId!),
    enabled: !!courseId,
  });

  const {
    data: sectionsData,
    isLoading: areSectionsLoading,
    isError: isSectionsError,
  } = useQuery({
    queryKey: ['student', 'course', courseId, 'sections'],
    queryFn: () => fetchSections(courseId!),
    enabled: !!courseId,
  });

  const sections = useMemo(() => sectionsData?.sections ?? [], [sectionsData]);
  const hasAccess = sectionsData?.hasAccess ?? courseData?.hasAccess ?? false;
  const completedLessonIds = new Set(sectionsData?.completedLessonIds ?? []);
  const canTrackProgress = sectionsData?.canTrackProgress ?? false;

  // Remember the last course a student viewed so the navbar's "Course Player"
  // link can take them straight back into it.
  useEffect(() => {
    if (courseId) {
      localStorage.setItem('student:lastCourseId', courseId);
    }
  }, [courseId]);

  const allLessons = useMemo(
    () => sections.flatMap((section) => section.lessons.map((lesson) => ({ ...lesson, sectionTitle: section.title }))),
    [sections],
  );
  const allVideos = useMemo(
    () => allLessons.flatMap((lesson) =>
      lesson.resources
        .filter((resource) => resource.type === 'VIDEO')
        .map((resource) => ({ lesson, resource })),
    ),
    [allLessons],
  );
  const completedLessonCount = allLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;

  const activeLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [allLessons, activeLessonId],
  );
  const activeLessonIsLocked = !!activeLesson
    && activeLesson.resources.length > 0
    && activeLesson.resources.every((resource) => resource.locked);

  const activeResource = useMemo(
    () => activeLesson?.resources.find((resource) => resource.id === activeResourceId) ?? null,
    [activeLesson, activeResourceId],
  );
  const activeVideoIndex = allVideos.findIndex(
    ({ lesson, resource }) => lesson.id === activeLessonId && resource.id === activeResourceId,
  );

  const handleSelectVideo = (index: number) => {
    const video = allVideos[index];
    if (!video) {
      return;
    }
    setActiveLessonId(video.lesson.id);
    setActiveResourceId(video.resource.id);
    setIsSidebarOpen(false);
  };

  const handleToggleLessonCompletion = async () => {
    if (!courseId || !activeLesson || !canTrackProgress || progressSaving) {
      return;
    }

    const completed = !completedLessonIds.has(activeLesson.id);
    setProgressSaving(true);
    setProgressError('');
    try {
      await api.put(`/student/courses/${courseId}/lessons/${activeLesson.id}/progress`, { completed });
      queryClient.setQueryData<StudentCourseSections>(
        ['student', 'course', courseId, 'sections'],
        (current) => {
          if (!current) return current;
          const nextIds = new Set(current.completedLessonIds);
          if (completed) {
            nextIds.add(activeLesson.id);
          } else {
            nextIds.delete(activeLesson.id);
          }
          return { ...current, completedLessonIds: [...nextIds] };
        },
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setProgressError(error.response?.data?.error ?? 'Unable to update lesson progress.');
        return;
      }
      if (error instanceof Error) {
        setProgressError(error.message);
      } else {
        setProgressError('Unable to update lesson progress.');
      }
    } finally {
      setProgressSaving(false);
    }
  };

  // Select the first lesson (and its first resource) once the curriculum loads.
  useEffect(() => {
    if (activeLessonId || allLessons.length === 0) {
      return;
    }
    const firstLesson = allLessons[0];
    setActiveLessonId(firstLesson.id);
    setActiveResourceId(firstLesson.resources[0]?.id ?? null);
  }, [allLessons, activeLessonId]);

  // Once the curriculum loads, collapse every section except the first so the
  // sidebar stays compact — especially useful on small screens.
  useEffect(() => {
    if (sections.length > 1) {
      setCollapsedSections(new Set(sections.slice(1).map((section) => section.id)));
    }
  }, [sections]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSelectLesson = (lesson: StudentLesson) => {
    setActiveLessonId(lesson.id);
    setActiveResourceId(lesson.resources[0]?.id ?? null);
    // Close the sidebar on small screens once a lesson is picked so the
    // content is immediately visible.
    setIsSidebarOpen(false);
  };

  const isLoading = isCourseLoading || areSectionsLoading;
  const isError = isCourseError || isSectionsError;

  return (
    <main className="lesson-player">

      {isError && (
        <p className="lesson-player__message lesson-player__message--error">
          <AlertCircle size={18} aria-hidden="true" />
          Unable to load this course. Please refresh and try again.
        </p>
      )}

      {isLoading ? (
        <p className="lesson-player__message">
          <Loader2 size={20} className="lesson-player__spinner" aria-hidden="true" />
          Loading course…
        </p>
      ) : allLessons.length === 0 ? (
        <p className="lesson-player__message">
          <BookOpen size={20} aria-hidden="true" />
          This course does not have any lessons yet.
        </p>
      ) : (
        <div className="lesson-player__body">
          {isSidebarOpen && (
            <button
              type="button"
              className="lesson-player__sidebar-backdrop"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close course curriculum"
            />
          )}
          <nav
            id="lesson-player-sidebar"
            className={`lesson-player__sidebar${isSidebarOpen ? ' is-open' : ''}`}
            aria-label="Course curriculum"
          >
            <header className="lesson-player__header">
              <div className="lesson-player__header-main">
                {courseData?.course && (
                  <div className="lesson-player__course-info">
                    <p className="lesson-player__course-label">Course</p>
                    <h1>{courseData.course.title}</h1>
                  </div>
                )}
                {canTrackProgress && (
                  <div className="lesson-player__course-progress">
                    <div className="lesson-player__course-progress-row">
                      <span>{completedLessonCount} of {allLessons.length} lessons complete</span>
                      <span className="lesson-player__course-progress-pct">
                        {allLessons.length > 0 ? Math.round((completedLessonCount / allLessons.length) * 100) : 0}%
                      </span>
                    </div>
                    <progress
                      value={completedLessonCount}
                      max={allLessons.length || 1}
                      aria-label="Course completion progress"
                    />
                  </div>
                )}
              </div>
              {!isLoading && !hasAccess && (
                <div className="lesson-player__access-badge">
                  <Lock size={14} aria-hidden="true" />
                  marka lacagta bixisid ka dib aya heli doontaa casharada
                </div>
              )}
              <button
                type="button"
                className="lesson-player__sidebar-close"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close curriculum"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            {sections.map((section) => {
              const isCollapsed = collapsedSections.has(section.id);
              return (
                <div className="lesson-player__section" key={section.id}>
                  <button
                    type="button"
                    className="lesson-player__section-toggle"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? (
                      <ChevronRight size={16} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={16} aria-hidden="true" />
                    )}
                    <h2>{section.title}</h2>
                    <span className="lesson-player__section-count">
                      {section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul>
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <div
                            className={`lesson-player__lesson-item${
                              lesson.id === activeLessonId ? ' is-active' : ''
                            }${completedLessonIds.has(lesson.id) ? ' is-complete' : ''}`}
                          >
                            <button
                              type="button"
                              className={`lesson-player__lesson-btn${lesson.id === activeLessonId ? ' is-active' : ''}`}
                              onClick={() => handleSelectLesson(lesson)}
                            >
                              {completedLessonIds.has(lesson.id) ? (
                                <CheckCircle2 size={16} className="lesson-player__lesson-status is-complete" aria-hidden="true" />
                              ) : (
                                <span className="lesson-player__lesson-status-dot" aria-hidden="true" />
                              )}
                              <span>{lesson.title}</span>
                              {lesson.resources.every((resource) => resource.locked) && lesson.resources.length > 0 && (
                                <Lock size={14} className="lesson-player__lock" aria-label="Locked" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="lesson-player__lesson-action"
                              onClick={() => handleSelectLesson(lesson)}
                            >
                              {completedLessonIds.has(lesson.id) ? 'Review' : 'Start'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <section className="lesson-player__content" aria-label="Lesson content">
            <div className="lesson-player__mobile-actions">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open course curriculum"
                aria-expanded={isSidebarOpen}
                aria-controls="lesson-player-sidebar"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              {courseData?.course && (
                <div className="lesson-player__mobile-info">
                  <strong>{courseData.course.title}</strong>
                  {canTrackProgress && (
                    <span>{completedLessonCount}/{allLessons.length} complete</span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate('/student/courses')}
                aria-label="Go to courses"
              >
                <BookOpen size={20} aria-hidden="true" />
              </button>
            </div>
            {activeLesson ? (
              <>
                <header className="lesson-player__lesson-header">
                  <div>
                    <p className="lesson-player__eyebrow">
                      {activeLesson.sectionTitle}
                    </p>
                    <h2>{activeLesson.title}</h2>
                    {activeLesson.description && <p className="lesson-player__description">{activeLesson.description}</p>}
                  </div>
                  <div className="lesson-player__lesson-actions">
                    <span className="lesson-player__lesson-progress">
                      Lesson {allLessons.findIndex((lesson) => lesson.id === activeLesson.id) + 1} of {allLessons.length}
                    </span>
                    {canTrackProgress && (
                      <button
                        type="button"
                        className="lesson-player__complete-btn"
                        onClick={handleToggleLessonCompletion}
                        disabled={progressSaving}
                      >
                        {progressSaving
                          ? 'Saving...'
                          : completedLessonIds.has(activeLesson.id)
                            ? 'Mark incomplete'
                            : 'Mark lesson complete'}
                      </button>
                    )}
                  </div>
                </header>

                {progressError && (
                  <p className="lesson-player__message lesson-player__message--error" role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    {progressError}
                  </p>
                )}

                {activeLesson.resources.length === 0 ? (
                  <p className="lesson-player__message">No materials have been added to this lesson yet.</p>
                ) : (
                  <>
                    {activeLessonIsLocked && (
                      <div className="lesson-player__resource-tabs">
                        {activeLesson.resources.map((resource) => {
                          const ResourceIcon = resource.type === 'VIDEO' ? Video : resource.type === 'PDF' ? FileText : Link2;
                          return (
                            <button
                              key={resource.id}
                              type="button"
                              className={`lesson-player__resource-tab${resource.id === activeResourceId ? ' is-active' : ''}`}
                              onClick={() => setActiveResourceId(resource.id)}
                            >
                              <ResourceIcon size={15} aria-hidden="true" />
                              {resource.type}
                              {resource.locked && <Lock size={13} aria-label="Locked" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="lesson-player__viewer">
                      {!activeResource ? null : activeResource.locked ? (
                        <div className="lesson-player__locked">
                          <Lock size={28} aria-hidden="true" />
                          <p>This content requires an active subscription.</p>
                          <Link to="/student/courses" className="lesson-player__unlock-link">
                            Browse plans
                          </Link>
                        </div>
                      ) : activeResource.type === 'VIDEO' && activeResource.url ? (
                        <div className="lesson-player__video-frame">
                          {getEmbedVideoUrl(activeResource.url) ? (
                            <iframe
                              key={activeResource.id}
                              className="lesson-player__video lesson-player__video-embed"
                              src={getEmbedVideoUrl(activeResource.url)!}
                              title={`${activeLesson.title} video`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video key={activeResource.id} className="lesson-player__video" src={activeResource.url} controls>
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      ) : activeResource.type === 'PDF' && activeResource.url ? (
                        <iframe
                          key={activeResource.id}
                          className="lesson-player__pdf"
                          src={activeResource.url}
                          title={`${activeLesson.title} PDF`}
                        />
                      ) : activeResource.url ? (
                        <a
                          className="lesson-player__external-link"
                          href={activeResource.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open resource in a new tab <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ) : (
                        <p className="lesson-player__message">This resource has no content yet.</p>
                      )}
                    </div>
                    {activeResource?.type === 'VIDEO' && (
                      <nav className="lesson-player__video-navigation" aria-label="Video navigation">
                        <button
                          type="button"
                          onClick={() => handleSelectVideo(activeVideoIndex - 1)}
                          disabled={activeVideoIndex <= 0}
                        >
                          <ChevronLeft size={16} aria-hidden="true" />
                          Previous video
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectVideo(activeVideoIndex + 1)}
                          disabled={activeVideoIndex < 0 || activeVideoIndex >= allVideos.length - 1}
                        >
                          Next video
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      </nav>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="lesson-player__message">Select a lesson to get started.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
