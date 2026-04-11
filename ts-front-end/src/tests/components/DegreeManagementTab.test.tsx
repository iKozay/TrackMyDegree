import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import DegreeManagementTab from '../../components/admin/DegreeManagementTab';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: { get: vi.fn() },
}));

const mockDegrees = [
  { _id: 'd1', name: 'BEng Software Engineering', totalCredits: 120, degreeType: 'BEng', coursePools: ['p1', 'p2'] },
  { _id: 'd2', name: 'BCompSc Computer Science', totalCredits: 90, degreeType: 'BCompSc', coursePools: ['p3'] },
];

const mockPools = [
  { _id: 'p1', name: 'Core Courses', creditsRequired: 60, courses: ['COMP248', 'COMP249'] },
  { _id: 'p2', name: 'Electives', creditsRequired: 30, courses: ['SOEN287'] },
];

const mockCourses = [
  { _id: 'c1', code: 'COMP 248', title: 'Object-Oriented I', credits: 3, offeredIn: ['F', 'W'] },
  { _id: 'c2', code: 'COMP 249', title: 'Object-Oriented II', credits: 3, offeredIn: ['W'] },
];

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DegreeManagementTab — Degrees sub-tab', () => {
  it('shows spinner while loading degrees', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<DegreeManagementTab />);
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('renders degree names after fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockDegrees as any);
    render(<DegreeManagementTab />);
    await waitFor(() => {
      expect(screen.getByText('BEng Software Engineering')).toBeInTheDocument();
      expect(screen.getByText('BCompSc Computer Science')).toBeInTheDocument();
    });
  });

  it('renders degree count', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockDegrees as any);
    render(<DegreeManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/2 degrees/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no degrees', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([] as any);
    render(<DegreeManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/No degrees found/i)).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'));
    render(<DegreeManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });

  it('renders Manage Pools button for each degree', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockDegrees as any);
    render(<DegreeManagementTab />);
    await waitFor(() => {
      const buttons = screen.getAllByText('Manage Pools');
      expect(buttons).toHaveLength(2);
    });
  });

  it('navigates to pools tab when Manage Pools is clicked', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)  // degrees panel initial load
      .mockResolvedValueOnce(mockDegrees as any)  // pools panel degrees load
      .mockResolvedValueOnce(mockPools as any);   // pools load

    render(<DegreeManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Manage Pools')).toHaveLength(2); });

    fireEvent.click(screen.getAllByText('Manage Pools')[0]);
    await waitFor(() => {
      expect(screen.getByText('Course Pools')).toBeInTheDocument();
    });
  });
});

describe('DegreeManagementTab — Course Pools sub-tab', () => {
  it('renders pools after selecting degree', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)  // degrees panel initial load
      .mockResolvedValueOnce(mockDegrees as any)  // pools panel degrees load
      .mockResolvedValueOnce(mockPools as any);   // pools load

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Course Pools'));

    await waitFor(() => {
      expect(screen.getByText('Core Courses')).toBeInTheDocument();
      expect(screen.getByText('Electives')).toBeInTheDocument();
    });
  });

  it('shows pool course count badges', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)  // degrees panel initial load
      .mockResolvedValueOnce(mockDegrees as any)  // pools panel degrees load
      .mockResolvedValueOnce(mockPools as any);   // pools load

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Course Pools'));

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 courses in Core
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 in Electives
    });
  });

  it('shows empty state when no pools', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)  // degrees panel initial load
      .mockResolvedValueOnce(mockDegrees as any)  // pools panel degrees load
      .mockResolvedValueOnce([] as any);          // empty pools

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Course Pools'));

    await waitFor(() => {
      expect(screen.getByText(/No pools found/i)).toBeInTheDocument();
    });
  });
});

describe('DegreeManagementTab — Courses sub-tab', () => {
  it('renders courses after fetch', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)   // degrees panel initial load
      .mockResolvedValueOnce(mockCourses as any);  // courses panel load

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Courses'));

    await waitFor(() => {
      expect(screen.getByText('Object-Oriented I')).toBeInTheDocument();
      expect(screen.getByText('Object-Oriented II')).toBeInTheDocument();
    });
  });

  it('shows empty state when no courses', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)  // degrees panel initial load
      .mockResolvedValueOnce([] as any);          // empty courses

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Courses'));

    await waitFor(() => {
      expect(screen.getByText(/No courses found/i)).toBeInTheDocument();
    });
  });

  it('filters courses by search input', async () => {
    vi.mocked(api.get).mockResolvedValue(mockCourses as any);
    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Courses'));

    await waitFor(() => { expect(screen.getByText('Object-Oriented I')).toBeInTheDocument(); });

    const searchInput = screen.getByPlaceholderText(/Search courses/i);
    fireEvent.change(searchInput, { target: { value: 'COMP' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=COMP'));
    });
  });

  it('renders Prev/Next pagination buttons', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockDegrees as any)   // degrees panel initial load
      .mockResolvedValueOnce(mockCourses as any);  // courses panel load

    render(<DegreeManagementTab />);
    fireEvent.click(screen.getByText('Courses'));

    await waitFor(() => {
      expect(screen.getByText(/‹ Prev/)).toBeInTheDocument();
      expect(screen.getByText(/Next ›/)).toBeInTheDocument();
    });
  });
});
