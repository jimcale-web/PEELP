import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
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
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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

async function fetchSections(courseId: string): Promise<{ sections: StudentSection[]; hasAccess: boolean }> {
  const res = await api.get<{ sections: StudentSection[]; hasAccess: boolean }>(`/student/courses/${courseId}/sections`);
  return res.data;
}

export default function LessonPlayer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const activeLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [allLessons, activeLessonId],
  );

  const activeResource = useMemo(
    () => activeLesson?.resources.find((resource) => resource.id === activeResourceId) ?? null,
    [activeLesson, activeResourceId],
  );

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
          Unable to load this course. Please refresh and try again.
        </p>
      )}

      {isLoading ? (
        <p className="lesson-player__message">Loading course…</p>
      ) : allLessons.length === 0 ? (
        <p className="lesson-player__message">This course does not have any lessons yet.</p>
      ) : (
        <div className="lesson-player__body">
          <button
            type="button"
            className="lesson-player__sidebar-toggle"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-expanded={isSidebarOpen}
            aria-controls="lesson-player-sidebar"
          >
            <Menu size={18} aria-hidden="true" /> Course curriculum
          </button>
          <nav
            id="lesson-player-sidebar"
            className={`lesson-player__sidebar${isSidebarOpen ? ' is-open' : ''}`}
            aria-label="Course curriculum"
          >
            <header className="lesson-player__header">
              <button type="button" className="lesson-player__back" onClick={() => navigate('/student/courses')}>
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
              {courseData?.course && (
                <div className="lesson-player__course-info">
                  <h1>{courseData.course.title}</h1>
                </div>
              )}
              {!isLoading && !hasAccess && (
                <span className="lesson-player__access-badge">Preview mode — free lessons only</span>
              )}
              <button
                type="button"
                className="lesson-player__sidebar-close"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close course curriculum"
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
                  </button>
                  {!isCollapsed && (
                    <ul>
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            className={`lesson-player__lesson-btn${lesson.id === activeLessonId ? ' is-active' : ''}`}
                            onClick={() => handleSelectLesson(lesson)}
                          >
                            <span>{lesson.title}</span>
                            {lesson.resources.every((resource) => resource.locked) && lesson.resources.length > 0 && (
                              <Lock size={14} className="lesson-player__lock" aria-label="Locked" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <section className="lesson-player__content" aria-label="Lesson content">
            {activeLesson ? (
              <>
                <h2>{activeLesson.title}</h2>
                {activeLesson.description && <p className="lesson-player__description">{activeLesson.description}</p>}

                {activeLesson.resources.length === 0 ? (
                  <p className="lesson-player__message">No materials have been added to this lesson yet.</p>
                ) : (
                  <>
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

                    <div className="lesson-player__viewer">
                      {!activeResource ? null : activeResource.locked ? (
                        <div className="lesson-player__locked">
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
