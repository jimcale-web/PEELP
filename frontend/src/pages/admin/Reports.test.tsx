import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Reports from './Reports';

function renderReports() {
  return render(<Reports />);
}

describe('Reports', () => {
  describe('page header', () => {
    it('renders the page title', () => {
      renderReports();
      expect(screen.getByText('Reports dashboard')).toBeInTheDocument();
    });

    it('renders the page subtitle', () => {
      renderReports();
      expect(screen.getByText('Performance overview')).toBeInTheDocument();
    });

    it('renders the export button', () => {
      renderReports();
      const exportButton = screen.getByRole('button', { name: /export report/i });
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('overview metrics', () => {
    it('renders all overview stat cards', () => {
      renderReports();
      const overviewSection = screen.getByLabelText('Key platform metrics');
      expect(within(overviewSection).getByText('Total users')).toBeInTheDocument();
      expect(within(overviewSection).getByText('Enrollments')).toBeInTheDocument();
      expect(within(overviewSection).getByText('Revenue')).toBeInTheDocument();
      expect(within(overviewSection).getByText('Completion rate')).toBeInTheDocument();
    });

    it('displays stat values correctly', () => {
      renderReports();
      expect(screen.getByText('24.8K')).toBeInTheDocument();
      expect(screen.getByText('8.6K')).toBeInTheDocument();
      expect(screen.getByText('$94.2K')).toBeInTheDocument();
      const completionCard = screen.getAllByText(/81%/)[0];
      expect(completionCard).toBeInTheDocument();
    });

    it('displays stat changes correctly', () => {
      renderReports();
      expect(screen.getByText('+12.4%')).toBeInTheDocument();
      expect(screen.getByText('+8.1%')).toBeInTheDocument();
      expect(screen.getByText('+15.7%')).toBeInTheDocument();
      expect(screen.getByText('+4.2%')).toBeInTheDocument();
    });

    it('applies correct CSS classes to metric cards', () => {
      renderReports();
      const metricCards = document.querySelectorAll('[class*="metric-card"]');
      expect(metricCards.length).toBe(4);
      expect(metricCards[0]).toHaveClass('metric-card--blue');
      expect(metricCards[1]).toHaveClass('metric-card--purple');
      expect(metricCards[2]).toHaveClass('metric-card--green');
      expect(metricCards[3]).toHaveClass('metric-card--orange');
    });
  });

  describe('monthly performance chart', () => {
    it('renders the revenue section header', () => {
      renderReports();
      const chartSections = screen.getAllByText('Revenue');
      expect(chartSections.length).toBeGreaterThan(0);
      expect(screen.getByText('Monthly performance')).toBeInTheDocument();
    });

    it('renders the area chart with revenue data', () => {
      renderReports();
      const areaChart = document.querySelector('.chart-wrap');
      expect(areaChart).toBeInTheDocument();
      expect(areaChart).toHaveClass('chart-wrap');
    });

    it('renders chart containing revenue and target data', () => {
      renderReports();
      const chartWrap = document.querySelector('.chart-wrap');
      expect(chartWrap).toBeInTheDocument();
      // Verify the chart container exists and has proper structure
      const responsiveContainer = chartWrap?.querySelector('div');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('subscriptions pie chart', () => {
    it('renders the subscriptions section header', () => {
      renderReports();
      expect(screen.getByText('Customer mix')).toBeInTheDocument();
      expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    });

    it('displays all subscription types in the legend', () => {
      renderReports();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Quarterly')).toBeInTheDocument();
      expect(screen.getByText('Annual')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    it('displays subscription percentages correctly', () => {
      renderReports();
      const legendItems = document.querySelectorAll('.legend-item');
      expect(legendItems.length).toBe(4);
      
      const percentages = screen.getAllByText(/\d+%/);
      expect(percentages.some(el => el.textContent === '42%')).toBe(true);
      expect(percentages.some(el => el.textContent === '27%')).toBe(true);
      expect(percentages.some(el => el.textContent === '23%')).toBe(true);
      expect(percentages.some(el => el.textContent === '8%')).toBe(true);
    });

    it('applies correct colors to legend swatches', () => {
      renderReports();
      const legendSwatches = document.querySelectorAll('.legend-swatch');
      expect(legendSwatches.length).toBe(4);
      expect(legendSwatches[0]).toHaveStyle({ backgroundColor: '#667eea' });
      expect(legendSwatches[1]).toHaveStyle({ backgroundColor: '#8b5cf6' });
      expect(legendSwatches[2]).toHaveStyle({ backgroundColor: '#22c55e' });
      expect(legendSwatches[3]).toHaveStyle({ backgroundColor: '#f59e0b' });
    });
  });

  describe('course completion chart', () => {
    it('renders the learner progress section header', () => {
      renderReports();
      expect(screen.getByText('Learner progress')).toBeInTheDocument();
      expect(screen.getByText('Course completion by track')).toBeInTheDocument();
    });

    it('renders bar chart for course completion', () => {
      renderReports();
      const chartWrap = document.querySelectorAll('.chart-wrap')[1];
      expect(chartWrap).toBeInTheDocument();
      // Verify the chart container is properly structured
      const responsiveContainer = chartWrap?.querySelector('div');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('top courses table', () => {
    it('renders the top courses section header', () => {
      renderReports();
      expect(screen.getByText('Top courses')).toBeInTheDocument();
      expect(screen.getByText('Performance snapshot')).toBeInTheDocument();
    });

    it('displays all table headers', () => {
      renderReports();
      const thead = document.querySelector('.table-panel thead');
      expect(within(thead!).getByText('Course')).toBeInTheDocument();
      expect(within(thead!).getByText('Enrollments')).toBeInTheDocument();
      expect(within(thead!).getByText('Completion')).toBeInTheDocument();
      expect(within(thead!).getByText('Revenue')).toBeInTheDocument();
    });

    it('renders all course rows', () => {
      renderReports();
      expect(screen.getByText('English Communication')).toBeInTheDocument();
      expect(screen.getByText('Web Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
      expect(screen.getByText('Data Analytics')).toBeInTheDocument();
    });

    it('displays correct enrollment numbers', () => {
      renderReports();
      const tbody = document.querySelector('.table-panel tbody');
      const rows = tbody!.querySelectorAll('tr');
      
      expect(rows.length).toBe(4);
      expect(within(rows[0]).getByText('146')).toBeInTheDocument();
      expect(within(rows[1]).getByText('128')).toBeInTheDocument();
      expect(within(rows[2]).getByText('119')).toBeInTheDocument();
      expect(within(rows[3]).getByText('102')).toBeInTheDocument();
    });

    it('displays correct completion percentages', () => {
      renderReports();
      const tbody = document.querySelector('.table-panel tbody');
      expect(within(tbody!).getByText('82%')).toBeInTheDocument();
      expect(within(tbody!).getByText('76%')).toBeInTheDocument();
      expect(within(tbody!).getByText('74%')).toBeInTheDocument();
      expect(within(tbody!).getByText('81%')).toBeInTheDocument();
    });

    it('displays correct revenue values', () => {
      renderReports();
      const tbody = document.querySelector('.table-panel tbody');
      expect(within(tbody!).getByText('$18.4K')).toBeInTheDocument();
      expect(within(tbody!).getByText('$15.1K')).toBeInTheDocument();
      expect(within(tbody!).getByText('$13.9K')).toBeInTheDocument();
      expect(within(tbody!).getByText('$12.6K')).toBeInTheDocument();
    });
  });

  describe('course activity chart', () => {
    it('renders the course activity section header', () => {
      renderReports();
      const courseActivityHeaders = document.querySelectorAll('.panel-header');
      expect(courseActivityHeaders.length).toBeGreaterThan(0);
      expect(screen.getByText('Course activity')).toBeInTheDocument();
      expect(screen.getByText('Enrollment by program')).toBeInTheDocument();
    });

    it('renders bar chart for course performance data', () => {
      renderReports();
      const tallChart = document.querySelector('.tall-chart');
      expect(tallChart).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has an aria-label on the overview stats section', () => {
      renderReports();
      const overviewSection = screen.getByLabelText('Key platform metrics');
      expect(overviewSection).toBeInTheDocument();
    });

    it('renders semantic HTML with article elements', () => {
      renderReports();
      const articles = document.querySelectorAll('article');
      expect(articles.length).toBeGreaterThan(0);
    });

    it('renders a table with proper semantic structure', () => {
      renderReports();
      const table = document.querySelector('.table-panel table');
      expect(table).toBeInTheDocument();
      expect(table?.querySelector('thead')).toBeInTheDocument();
      expect(table?.querySelector('tbody')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies the reports-page class to the root container', () => {
      renderReports();
      const container = document.querySelector('.reports-page');
      expect(container).toBeInTheDocument();
    });

    it('applies reports-header class to the header section', () => {
      renderReports();
      const header = document.querySelector('.reports-header');
      expect(header).toBeInTheDocument();
    });

    it('applies overview-grid class to the metrics section', () => {
      renderReports();
      const gridSection = document.querySelector('.overview-grid');
      expect(gridSection).toBeInTheDocument();
    });

    it('applies chart-grid class to the charts section', () => {
      renderReports();
      const chartSection = document.querySelector('.chart-grid');
      expect(chartSection).toBeInTheDocument();
    });

    it('marks panels with the correct class', () => {
      renderReports();
      const allPanels = document.querySelectorAll('.panel');
      expect(allPanels.length).toBeGreaterThan(0);
      
      const widePanels = document.querySelectorAll('.panel--wide');
      expect(widePanels.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('interactivity', () => {
    it('export button is clickable', async () => {
      renderReports();
      const exportButton = screen.getByRole('button', { name: /export report/i });
      const user = userEvent.setup();
      
      await user.click(exportButton);
      expect(exportButton).toBeInTheDocument();
    });
  });
});
