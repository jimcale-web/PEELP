import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '../../services/api';
import '../../styles/SectionQuizBuilder.css';

type Choice = { text: string; isCorrect: boolean };
type QuizQuestion =
  | { type: 'MULTIPLE_CHOICE'; prompt: string; options: Choice[] }
  | { type: 'MATCHING'; prompt: string; pairs: { leftText: string; rightText: string }[] };

interface InstructorQuiz {
  id: string;
  title: string;
  passingScore: number;
  questions: Array<{
    id: string;
    type: 'MULTIPLE_CHOICE' | 'MATCHING';
    prompt: string;
    options: Choice[];
    matchPairs: { leftText: string; rightText: string }[];
  }>;
}

function freshMultipleChoice(): QuizQuestion {
  return {
    type: 'MULTIPLE_CHOICE',
    prompt: '',
    options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
  };
}

function mapQuizQuestions(quiz: InstructorQuiz | null, sectionTitle: string) {
  if (!quiz) return { title: `${sectionTitle} Quiz`, passingScore: 70, questions: [freshMultipleChoice()] };
  return {
    title: quiz.title,
    passingScore: quiz.passingScore,
    questions: quiz.questions.map((question): QuizQuestion => question.type === 'MULTIPLE_CHOICE'
      ? {
          type: 'MULTIPLE_CHOICE',
          prompt: question.prompt,
          options: question.options.map(({ text, isCorrect }) => ({ text, isCorrect })),
        }
      : {
          type: 'MATCHING',
          prompt: question.prompt,
          pairs: question.matchPairs.map(({ leftText, rightText }) => ({ leftText, rightText })),
        }),
  };
}

interface SectionQuizBuilderProps {
  courseId: string;
  sectionId: string;
  sectionTitle: string;
}

export default function SectionQuizBuilder({ courseId, sectionId, sectionTitle }: SectionQuizBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['instructor', 'section-quiz', courseId, sectionId];

  const quizQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<{ quiz: InstructorQuiz | null }>(
        `/instructor/courses/${courseId}/sections/${sectionId}/quiz`,
      );
      return response.data.quiz;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || quizQuery.isPending || quizQuery.isError) return;
    const draft = mapQuizQuestions(quizQuery.data ?? null, sectionTitle);
    setTitle(draft.title);
    setPassingScore(draft.passingScore);
    setQuestions(draft.questions);
  }, [isOpen, quizQuery.data, quizQuery.isError, quizQuery.isPending, sectionTitle]);

  const saveQuiz = async () => {
    setError('');
    if (questions.some((question) => !question.prompt.trim())) {
      setError('Every question needs a prompt.');
      return;
    }
    if (questions.some((question) => question.type === 'MULTIPLE_CHOICE' && question.options.some((option) => !option.text.trim()))) {
      setError('Complete every answer choice before saving.');
      return;
    }
    if (questions.some((question) => question.type === 'MATCHING' && question.pairs.some((pair) => !pair.leftText.trim() || !pair.rightText.trim()))) {
      setError('Complete every matching pair before saving.');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put<{ quiz: InstructorQuiz }>(
        `/instructor/courses/${courseId}/sections/${sectionId}/quiz`,
        {
          title,
          passingScore,
          questions,
        },
      );
      queryClient.setQueryData(queryKey, response.data.quiz);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (saveError: unknown) {
      if (axios.isAxiosError(saveError)) {
        setError(saveError.response?.data?.error ?? 'Unable to save the quiz.');
      } else {
        setError(saveError instanceof Error ? saveError.message : 'Unable to save the quiz.');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateQuestionPrompt = (index: number, prompt: string) => {
    setQuestions((current) => current.map((question, currentIndex) =>
      currentIndex === index ? { ...question, prompt } : question,
    ));
  };

  return (
    <section className="section-quiz-builder">
      <button
        type="button"
        className="section-quiz-builder__toggle"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open);
          setError('');
        }}
      >
        {isOpen ? 'Close quiz builder' : 'Build section quiz'}
      </button>
      {isOpen && (
        <div className="section-quiz-builder__panel">
          <h4>Quiz for {sectionTitle}</h4>
          {quizQuery.isPending ? (
            <p>Loading quiz…</p>
          ) : quizQuery.isError ? (
            <p className="section-quiz-builder__error" role="alert">Unable to load this quiz. Please try again.</p>
          ) : (
            <>
              <label className="section-quiz-builder__field">
                Quiz title
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} />
              </label>
              <label className="section-quiz-builder__field">
                Passing score (%)
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(event) => setPassingScore(Number(event.target.value))}
                />
              </label>

              {questions.map((question, questionIndex) => (
                <fieldset className="section-quiz-builder__question" key={questionIndex}>
                  <legend>Question {questionIndex + 1}</legend>
                  <div className="section-quiz-builder__question-heading">
                    <select
                      aria-label={`Question ${questionIndex + 1} type`}
                      value={question.type}
                      onChange={(event) => {
                        const nextQuestion = event.target.value === 'MATCHING'
                          ? { type: 'MATCHING' as const, prompt: question.prompt, pairs: [{ leftText: '', rightText: '' }, { leftText: '', rightText: '' }] }
                          : freshMultipleChoice();
                        setQuestions((current) => current.map((item, index) => index === questionIndex ? nextQuestion : item));
                      }}
                    >
                      <option value="MULTIPLE_CHOICE">Multiple choice</option>
                      <option value="MATCHING">Matching</option>
                    </select>
                    <button
                      type="button"
                      className="section-quiz-builder__remove"
                      onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}
                      disabled={questions.length === 1}
                    >
                      Remove question
                    </button>
                  </div>
                  <label className="section-quiz-builder__field">
                    Prompt
                    <textarea
                      value={question.prompt}
                      onChange={(event) => updateQuestionPrompt(questionIndex, event.target.value)}
                      rows={2}
                    />
                  </label>

                  {question.type === 'MULTIPLE_CHOICE' ? (
                    <div className="section-quiz-builder__answers">
                      <p>Select the correct answer:</p>
                      {question.options.map((option, optionIndex) => (
                        <div className="section-quiz-builder__answer" key={optionIndex}>
                          <input
                            type="radio"
                            name={`correct-${sectionId}-${questionIndex}`}
                            aria-label={`Mark choice ${optionIndex + 1} correct`}
                            checked={option.isCorrect}
                            onChange={() => setQuestions((current) => current.map((item, index) => {
                              if (index !== questionIndex || item.type !== 'MULTIPLE_CHOICE') return item;
                              return {
                                ...item,
                                options: item.options.map((choice, choiceIndex) => ({
                                  ...choice,
                                  isCorrect: choiceIndex === optionIndex,
                                })),
                              };
                            }))}
                          />
                          <input
                            aria-label={`Choice ${optionIndex + 1}`}
                            value={option.text}
                            onChange={(event) => setQuestions((current) => current.map((item, index) => {
                              if (index !== questionIndex || item.type !== 'MULTIPLE_CHOICE') return item;
                              return {
                                ...item,
                                options: item.options.map((choice, choiceIndex) =>
                                  choiceIndex === optionIndex ? { ...choice, text: event.target.value } : choice,
                                ),
                              };
                            }))}
                          />
                          <button
                            type="button"
                            aria-label={`Remove choice ${optionIndex + 1}`}
                            onClick={() => setQuestions((current) => current.map((item, index) => {
                              if (index !== questionIndex || item.type !== 'MULTIPLE_CHOICE' || item.options.length <= 2) return item;
                              const options = item.options.filter((_, choiceIndex) => choiceIndex !== optionIndex);
                              if (!options.some((choice) => choice.isCorrect)) options[0].isCorrect = true;
                              return { ...item, options };
                            }))}
                            disabled={question.options.length <= 2}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQuestions((current) => current.map((item, index) =>
                          index === questionIndex && item.type === 'MULTIPLE_CHOICE' && item.options.length < 8
                            ? { ...item, options: [...item.options, { text: '', isCorrect: false }] }
                            : item,
                        ))}
                        disabled={question.options.length >= 8}
                      >
                        Add choice
                      </button>
                    </div>
                  ) : (
                    <div className="section-quiz-builder__answers">
                      <p>Enter each matching pair:</p>
                      {question.pairs.map((pair, pairIndex) => (
                        <div className="section-quiz-builder__pair" key={pairIndex}>
                          <input
                            aria-label={`Match item ${pairIndex + 1}`}
                            value={pair.leftText}
                            onChange={(event) => setQuestions((current) => current.map((item, index) =>
                              index === questionIndex && item.type === 'MATCHING'
                                ? { ...item, pairs: item.pairs.map((value, i) => i === pairIndex ? { ...value, leftText: event.target.value } : value) }
                                : item,
                            ))}
                          />
                          <span>matches</span>
                          <input
                            aria-label={`Match answer ${pairIndex + 1}`}
                            value={pair.rightText}
                            onChange={(event) => setQuestions((current) => current.map((item, index) =>
                              index === questionIndex && item.type === 'MATCHING'
                                ? { ...item, pairs: item.pairs.map((value, i) => i === pairIndex ? { ...value, rightText: event.target.value } : value) }
                                : item,
                            ))}
                          />
                          <button
                            type="button"
                            aria-label={`Remove pair ${pairIndex + 1}`}
                            disabled={question.pairs.length <= 2}
                            onClick={() => setQuestions((current) => current.map((item, index) =>
                              index === questionIndex && item.type === 'MATCHING' && item.pairs.length > 2
                                ? { ...item, pairs: item.pairs.filter((_, i) => i !== pairIndex) }
                                : item,
                            ))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQuestions((current) => current.map((item, index) =>
                          index === questionIndex && item.type === 'MATCHING' && item.pairs.length < 8
                            ? { ...item, pairs: [...item.pairs, { leftText: '', rightText: '' }] }
                            : item,
                        ))}
                        disabled={question.pairs.length >= 8}
                      >
                        Add pair
                      </button>
                    </div>
                  )}
                </fieldset>
              ))}

              <div className="section-quiz-builder__actions">
                <button type="button" onClick={() => setQuestions((current) => [...current, freshMultipleChoice()])} disabled={questions.length >= 50}>
                  Add multiple-choice question
                </button>
                <button
                  type="button"
                  onClick={() => setQuestions((current) => [...current, { type: 'MATCHING', prompt: '', pairs: [{ leftText: '', rightText: '' }, { leftText: '', rightText: '' }] }])}
                  disabled={questions.length >= 50}
                >
                  Add matching question
                </button>
                <button type="button" className="section-quiz-builder__save" onClick={saveQuiz} disabled={saving}>
                  {saving ? 'Saving…' : 'Save quiz'}
                </button>
              </div>
              {error && <p className="section-quiz-builder__error" role="alert">{error}</p>}
              {quizQuery.data && <p className="section-quiz-builder__hint">Students can retake this quiz until they reach the passing score.</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
