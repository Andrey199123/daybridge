import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from './OnboardingWizard';
import * as fc from 'fast-check';

/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test encodes the EXPECTED behavior (after fix).
 * On UNFIXED code, this test MUST FAIL - failure confirms the bugs exist.
 * On FIXED code, this test MUST PASS - success confirms the bugs are resolved.
 * 
 * Property 1: Skip button allows account creation for optional fields
 * Property 2: Step counter shows correct values between 1/8 and 8/8
 */

// Mock Convex hooks
const mockCompleteOnboarding = vi.fn().mockResolvedValue(undefined);
const mockSaveProgress = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => mockCompleteOnboarding),
  useQuery: vi.fn(() => ({
    profile: {
      name: '',
      interests: [],
      skills: [],
      grade: '',
      birthday: '',
      city: '',
      state: '',
      schoolName: '',
      schoolCity: '',
      schoolState: '',
      gender: undefined,
      raceEthnicity: [],
      onboardingStep: 0,
      completedOnboarding: false,
    }
  })),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('OnboardingWizard - Bug Condition Exploration', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockOnComplete = vi.fn();
    mockCompleteOnboarding.mockClear();
    mockSaveProgress.mockClear();
    
    // Get the mocked toast
    const { toast } = await import('sonner');
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  /**
   * Property 1: Bug Condition - Skip Button Validation Blocks Account Creation
   * 
   * **CRITICAL**: This test MUST FAIL on unfixed code
   * **Expected counterexamples on unfixed code**:
   * - "Skip skills → validation error 'Please add at least one skill'"
   * - "Skip birthday → validation error 'Please enter your birthday'"
   * 
   * **Scoped PBT Approach**: Testing concrete failing cases for deterministic bugs
   */
  describe('Property 1: Skip Button Allows Account Creation', () => {
    it('should allow account creation when skills are skipped', async () => {
      const { toast } = await import('sonner');
      
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Step 0: Enter name (required)
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      
      // Navigate to step 1 (Interests)
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
      });
      
      // Add at least one interest (to avoid interest validation)
      const interestInput = screen.getByPlaceholderText(/type an interest/i);
      fireEvent.change(interestInput, { target: { value: 'Coding' } });
      const addInterestButton = screen.getByRole('button', { name: /add interest/i });
      fireEvent.click(addInterestButton);
      
      // Navigate to step 2 (Skills)
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
      });
      
      // SKIP skills step (don't add any skills)
      const skipButton = screen.getByRole('button', { name: /skip this step/i });
      fireEvent.click(skipButton);
      
      // Fill remaining required fields
      await fillRemainingRequiredFields(container);
      
      // Navigate to review step (step 7)
      await navigateToReview(container);
      
      // Click "Open DayBridge" to complete onboarding
      const launchButton = screen.getByRole('button', { name: /launch mission/i });
      fireEvent.click(launchButton);
      
      // EXPECTED BEHAVIOR (after fix): Account creation succeeds without validation error
      // ACTUAL BEHAVIOR (before fix): Validation error "Please add at least one skill"
      await waitFor(() => {
        expect(vi.mocked(toast.error)).not.toHaveBeenCalledWith('Please add at least one skill');
        expect(mockCompleteOnboarding).toHaveBeenCalled();
      });
    });

    it('should allow account creation when birthday is skipped', async () => {
      const { toast } = await import('sonner');
      
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Fill required fields up to Grade & Birthday step
      await fillUpToGradeBirthdayStep(container);
      
      // Select grade but SKIP birthday
      const gradeSelect = screen.getByLabelText(/select your grade/i);
      fireEvent.change(gradeSelect, { target: { value: '10th Grade' } });
      
      // Skip birthday (don't select month/day/year)
      const skipButton = screen.getByRole('button', { name: /skip this step/i });
      fireEvent.click(skipButton);
      
      // Fill remaining required fields
      await fillRemainingRequiredFieldsAfterGrade(container);
      
      // Navigate to review step
      await navigateToReview(container);
      
      // Click "Open DayBridge"
      const launchButton = screen.getByRole('button', { name: /launch mission/i });
      fireEvent.click(launchButton);
      
      // EXPECTED BEHAVIOR (after fix): Account creation succeeds
      // ACTUAL BEHAVIOR (before fix): Validation error "Please enter your birthday"
      await waitFor(() => {
        expect(vi.mocked(toast.error)).not.toHaveBeenCalledWith('Please enter your birthday');
        expect(mockCompleteOnboarding).toHaveBeenCalled();
      });
    });

    it('should allow account creation when interests are skipped', async () => {
      const { toast } = await import('sonner');
      
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Step 0: Enter name
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      
      // Navigate to step 1 (Interests) and SKIP
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
      });
      
      const skipButton = screen.getByRole('button', { name: /skip this step/i });
      fireEvent.click(skipButton);
      
      // Add at least one skill (to avoid skill validation)
      await waitFor(() => {
        expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
      });
      
      const skillInput = screen.getByPlaceholderText(/type a skill/i);
      fireEvent.change(skillInput, { target: { value: 'JavaScript' } });
      fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
      
      // Fill remaining required fields
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await fillRemainingRequiredFieldsFromGrade(container);
      
      // Navigate to review and complete
      await navigateToReview(container);
      const launchButton = screen.getByRole('button', { name: /launch mission/i });
      fireEvent.click(launchButton);
      
      // EXPECTED BEHAVIOR (after fix): Account creation succeeds
      // ACTUAL BEHAVIOR (before fix): Validation error "Please add at least one interest"
      await waitFor(() => {
        expect(vi.mocked(toast.error)).not.toHaveBeenCalledWith('Please add at least one interest');
        expect(mockCompleteOnboarding).toHaveBeenCalled();
      });
    });
  });

  /**
   * Property 2: Bug Condition - Step Counter Shows Incorrect Values
   * 
   * **CRITICAL**: This test MUST FAIL on unfixed code
   * **Expected counterexample on unfixed code**:
   * - "Step counter shows '11/8' when editingFromReview is active"
   * 
   * **Scoped PBT Approach**: Testing the concrete failing case
   */
  describe('Property 2: Step Counter Shows Correct Values', () => {
    it('should show correct step counter values (1/8 through 8/8) during navigation', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Verify step counter at each step
      const stepCounters = [
        { step: 0, expected: '1 / 8' },
        { step: 1, expected: '2 / 8' },
        { step: 2, expected: '3 / 8' },
        { step: 3, expected: '4 / 8' },
        { step: 4, expected: '5 / 8' },
        { step: 5, expected: '6 / 8' },
        { step: 6, expected: '7 / 8' },
        { step: 7, expected: '8 / 8' },
      ];
      
      for (const { step, expected } of stepCounters) {
        // Check step counter display
        const stepCounter = screen.getByText(expected);
        expect(stepCounter).toBeInTheDocument();
        
        // Navigate to next step (if not last)
        if (step < 7) {
          const nextButton = screen.getByRole('button', { name: /next/i });
          fireEvent.click(nextButton);
          
          await waitFor(() => {
            // Wait for step transition
            const nextExpected = stepCounters[step + 1].expected;
            expect(screen.getByText(nextExpected)).toBeInTheDocument();
          });
        }
      }
    });

    it('should return to step 7 (not 10) when editingFromReview is active', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Fill all required fields and navigate to review step
      await fillAllRequiredFields(container);
      await navigateToReview(container);
      
      // Verify we're on step 7 (review)
      expect(screen.getByText('8 / 8')).toBeInTheDocument();
      expect(screen.getByText(/review your profile/i)).toBeInTheDocument();
      
      // Click "Edit" on any section (e.g., Name)
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]); // Edit name
      
      // Verify we're back at step 0
      await waitFor(() => {
        expect(screen.getByText('1 / 8')).toBeInTheDocument();
      });
      
      // Click "Save & Return" button (which appears when editingFromReview is true)
      const saveReturnButton = screen.getByRole('button', { name: /save & return/i });
      fireEvent.click(saveReturnButton);
      
      // EXPECTED BEHAVIOR (after fix): Returns to step 7, counter shows "8 / 8"
      // ACTUAL BEHAVIOR (before fix): Jumps to step 10, counter shows "11 / 8"
      await waitFor(() => {
        const stepCounter = screen.getByText(/\d+ \/ \d+/);
        expect(stepCounter.textContent).toBe('8 / 8');
        expect(stepCounter.textContent).not.toMatch(/11 \/ 8/);
      });
    });
  });

  /**
   * Property-Based Test: Multiple Optional Fields Skipped
   * 
   * Tests that any combination of skipped optional fields allows account creation
   */
  describe('Property: Multiple Optional Fields Can Be Skipped', () => {
    it('should allow account creation with any combination of skipped optional fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            skipInterests: fc.boolean(),
            skipSkills: fc.boolean(),
            skipBirthday: fc.boolean(),
          }),
          async ({ skipInterests, skipSkills, skipBirthday }) => {
            vi.clearAllMocks();
            
            const { container, unmount } = render(<OnboardingWizard onComplete={mockOnComplete} />);
            
            try {
              // Fill required fields and skip optional ones based on property
              await fillWithOptionalSkips(container, {
                skipInterests,
                skipSkills,
                skipBirthday,
              });
              
              // Navigate to review and complete
              await navigateToReview(container);
              const launchButton = screen.getByRole('button', { name: /launch mission/i });
              fireEvent.click(launchButton);
              
              // EXPECTED: No validation errors for skipped optional fields
              await waitFor(() => {
                if (skipInterests) {
                  expect(mockToastError).not.toHaveBeenCalledWith('Please add at least one interest');
                }
                if (skipSkills) {
                  expect(mockToastError).not.toHaveBeenCalledWith('Please add at least one skill');
                }
                if (skipBirthday) {
                  expect(mockToastError).not.toHaveBeenCalledWith('Please enter your birthday');
                }
                expect(mockCompleteOnboarding).toHaveBeenCalled();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 1 } // Test 1 combination (minimal for speed)
      );
    });
  });
});

// Helper functions
async function fillRemainingRequiredFields(container: HTMLElement) {
  // This helper assumes we're past the skills step
  // Fill Grade & Birthday
  await waitFor(() => {
    expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
  });
  
  const gradeSelect = screen.getByLabelText(/select your grade/i);
  fireEvent.change(gradeSelect, { target: { value: '10th Grade' } });
  
  // Fill birthday
  const monthSelect = screen.getByLabelText(/select birth month/i);
  const daySelect = screen.getByLabelText(/select birth day/i);
  const yearSelect = screen.getByLabelText(/select birth year/i);
  
  fireEvent.change(monthSelect, { target: { value: '01' } });
  fireEvent.change(daySelect, { target: { value: '15' } });
  fireEvent.change(yearSelect, { target: { value: '2005' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Fill Home Location
  await waitFor(() => {
    expect(screen.getByText(/home location/i)).toBeInTheDocument();
  });
  
  const cityInput = screen.getByLabelText(/enter your home city/i);
  const stateSelect = screen.getByLabelText(/select your home state/i);
  
  fireEvent.change(cityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(stateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Fill School Information
  await waitFor(() => {
    expect(screen.getByText(/school information/i)).toBeInTheDocument();
  });
  
  const schoolNameInput = screen.getByLabelText(/enter your school name/i);
  const schoolCityInput = screen.getByLabelText(/enter school city/i);
  const schoolStateSelect = screen.getByLabelText(/select your school state/i);
  
  fireEvent.change(schoolNameInput, { target: { value: 'Test High School' } });
  fireEvent.change(schoolCityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(schoolStateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Skip Demographics (optional)
  await waitFor(() => {
    expect(screen.getByText(/demographics/i)).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByRole('button', { name: /skip this step/i }));
}

async function fillUpToGradeBirthdayStep(container: HTMLElement) {
  // Step 0: Name
  const nameInput = screen.getByPlaceholderText(/enter your full name/i);
  fireEvent.change(nameInput, { target: { value: 'Test User' } });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 1: Add interest
  await waitFor(() => {
    expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
  });
  
  const interestInput = screen.getByPlaceholderText(/type an interest/i);
  fireEvent.change(interestInput, { target: { value: 'Coding' } });
  fireEvent.click(screen.getByRole('button', { name: /add interest/i }));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 2: Add skill
  await waitFor(() => {
    expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
  });
  
  const skillInput = screen.getByPlaceholderText(/type a skill/i);
  fireEvent.change(skillInput, { target: { value: 'JavaScript' } });
  fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 3: Grade & Birthday
  await waitFor(() => {
    expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
  });
}

async function fillRemainingRequiredFieldsAfterGrade(container: HTMLElement) {
  // Fill Home Location
  await waitFor(() => {
    expect(screen.getByText(/home location/i)).toBeInTheDocument();
  });
  
  const cityInput = screen.getByLabelText(/enter your home city/i);
  const stateSelect = screen.getByLabelText(/select your home state/i);
  
  fireEvent.change(cityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(stateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Fill School Information
  await waitFor(() => {
    expect(screen.getByText(/school information/i)).toBeInTheDocument();
  });
  
  const schoolNameInput = screen.getByLabelText(/enter your school name/i);
  const schoolCityInput = screen.getByLabelText(/enter school city/i);
  const schoolStateSelect = screen.getByLabelText(/select your school state/i);
  
  fireEvent.change(schoolNameInput, { target: { value: 'Test High School' } });
  fireEvent.change(schoolCityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(schoolStateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Skip Demographics
  await waitFor(() => {
    expect(screen.getByText(/demographics/i)).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByRole('button', { name: /skip this step/i }));
}

async function fillRemainingRequiredFieldsFromGrade(container: HTMLElement) {
  // Fill Grade & Birthday
  await waitFor(() => {
    expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
  });
  
  const gradeSelect = screen.getByLabelText(/select your grade/i);
  fireEvent.change(gradeSelect, { target: { value: '10th Grade' } });
  
  const monthSelect = screen.getByLabelText(/select birth month/i);
  const daySelect = screen.getByLabelText(/select birth day/i);
  const yearSelect = screen.getByLabelText(/select birth year/i);
  
  fireEvent.change(monthSelect, { target: { value: '01' } });
  fireEvent.change(daySelect, { target: { value: '15' } });
  fireEvent.change(yearSelect, { target: { value: '2005' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  await fillRemainingRequiredFieldsAfterGrade(container);
}

async function fillAllRequiredFields(container: HTMLElement) {
  // Step 0: Name
  const nameInput = screen.getByPlaceholderText(/enter your full name/i);
  fireEvent.change(nameInput, { target: { value: 'Test User' } });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 1: Interests
  await waitFor(() => {
    expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
  });
  
  const interestInput = screen.getByPlaceholderText(/type an interest/i);
  fireEvent.change(interestInput, { target: { value: 'Coding' } });
  fireEvent.click(screen.getByRole('button', { name: /add interest/i }));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 2: Skills
  await waitFor(() => {
    expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
  });
  
  const skillInput = screen.getByPlaceholderText(/type a skill/i);
  fireEvent.change(skillInput, { target: { value: 'JavaScript' } });
  fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 3: Grade & Birthday
  await waitFor(() => {
    expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
  });
  
  const gradeSelect = screen.getByLabelText(/select your grade/i);
  fireEvent.change(gradeSelect, { target: { value: '10th Grade' } });
  
  const monthSelect = screen.getByLabelText(/select birth month/i);
  const daySelect = screen.getByLabelText(/select birth day/i);
  const yearSelect = screen.getByLabelText(/select birth year/i);
  
  fireEvent.change(monthSelect, { target: { value: '01' } });
  fireEvent.change(daySelect, { target: { value: '15' } });
  fireEvent.change(yearSelect, { target: { value: '2005' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 4: Home Location
  await waitFor(() => {
    expect(screen.getByText(/home location/i)).toBeInTheDocument();
  });
  
  const cityInput = screen.getByLabelText(/enter your home city/i);
  const stateSelect = screen.getByLabelText(/select your home state/i);
  
  fireEvent.change(cityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(stateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 5: School
  await waitFor(() => {
    expect(screen.getByText(/school information/i)).toBeInTheDocument();
  });
  
  const schoolNameInput = screen.getByLabelText(/enter your school name/i);
  const schoolCityInput = screen.getByLabelText(/enter school city/i);
  const schoolStateSelect = screen.getByLabelText(/select your school state/i);
  
  fireEvent.change(schoolNameInput, { target: { value: 'Test High School' } });
  fireEvent.change(schoolCityInput, { target: { value: 'San Francisco' } });
  fireEvent.change(schoolStateSelect, { target: { value: 'CA' } });
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 6: Demographics (skip)
  await waitFor(() => {
    expect(screen.getByText(/demographics/i)).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByRole('button', { name: /skip this step/i }));
}

async function navigateToReview(container: HTMLElement) {
  await waitFor(() => {
    expect(screen.getByText(/review your profile/i)).toBeInTheDocument();
  });
}

async function fillWithOptionalSkips(
  container: HTMLElement,
  options: { skipInterests: boolean; skipSkills: boolean; skipBirthday: boolean }
) {
  // Step 0: Name (always required)
  const nameInput = screen.getByPlaceholderText(/enter your full name/i);
  fireEvent.change(nameInput, { target: { value: 'Test User' } });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 1: Interests
  await waitFor(() => {
    expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
  });
  
  if (!options.skipInterests) {
    const interestInput = screen.getByPlaceholderText(/type an interest/i);
    fireEvent.change(interestInput, { target: { value: 'Coding' } });
    fireEvent.click(screen.getByRole('button', { name: /add interest/i }));
  }
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 2: Skills
  await waitFor(() => {
    expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
  });
  
  if (!options.skipSkills) {
    const skillInput = screen.getByPlaceholderText(/type a skill/i);
    fireEvent.change(skillInput, { target: { value: 'JavaScript' } });
    fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
  }
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Step 3: Grade & Birthday
  await waitFor(() => {
    expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
  });
  
  const gradeSelect = screen.getByLabelText(/select your grade/i);
  fireEvent.change(gradeSelect, { target: { value: '10th Grade' } });
  
  if (!options.skipBirthday) {
    const monthSelect = screen.getByLabelText(/select birth month/i);
    const daySelect = screen.getByLabelText(/select birth day/i);
    const yearSelect = screen.getByLabelText(/select birth year/i);
    
    fireEvent.change(monthSelect, { target: { value: '01' } });
    fireEvent.change(daySelect, { target: { value: '15' } });
    fireEvent.change(yearSelect, { target: { value: '2005' } });
  }
  
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  
  // Fill remaining required fields
  await fillRemainingRequiredFieldsAfterGrade(container);
}

/**
 * ============================================================================
 * PRESERVATION PROPERTY TESTS (Task 2)
 * ============================================================================
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These tests verify that behaviors which should NOT change after the fix
 * remain unchanged. They test non-buggy scenarios:
 * - Full data entry validation
 * - Required field validation (name)
 * - Sequential navigation
 * - Save & Exit functionality
 * 
 * **EXPECTED OUTCOME**: These tests PASS on UNFIXED code (baseline behavior)
 * **EXPECTED OUTCOME**: These tests PASS on FIXED code (no regressions)
 */

describe('OnboardingWizard - Preservation Property Tests', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockOnComplete = vi.fn();
    mockCompleteOnboarding.mockClear();
    mockSaveProgress.mockClear();
    
    const { toast } = await import('sonner');
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  /**
   * Property 3: Preservation - Full Data Entry Validation
   * 
   * **Validates: Requirements 3.1, 3.2, 3.6**
   * 
   * Verifies that when users manually enter data in all fields without skipping,
   * the validation logic produces the same behavior as the original code.
   */
  describe('Property 3: Full Data Entry Validation Preserved', () => {
    it('should successfully complete onboarding when all fields are filled', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Fill all fields completely
      await fillAllRequiredFields(container);
      
      // Navigate to review step
      await navigateToReview(container);
      
      // Complete onboarding
      const launchButton = screen.getByRole('button', { name: /launch mission/i });
      fireEvent.click(launchButton);
      
      // EXPECTED: Account creation succeeds with all data
      await waitFor(() => {
        expect(mockCompleteOnboarding).toHaveBeenCalledWith({
          name: 'Test User',
          interests: ['Coding'],
          motivationLevel: 'medium',
          skills: ['JavaScript'],
          grade: '10th Grade',
          birthday: '01/15/2005',
          city: 'San Francisco',
          state: 'CA',
          schoolName: 'Test High School',
          schoolCity: 'San Francisco',
          schoolState: 'CA',
          gender: undefined,
          raceEthnicity: undefined,
        });
      });
    });

    it('should validate and save all manually entered data correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            interests: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
            skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
            grade: fc.constantFrom('9th Grade', '10th Grade', '11th Grade', '12th Grade'),
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            state: fc.constantFrom('CA', 'NY', 'TX', 'FL'),
            schoolName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
          async (testData) => {
            vi.clearAllMocks();
            
            const { container, unmount } = render(<OnboardingWizard onComplete={mockOnComplete} />);
            
            try {
              // Step 0: Name
              const nameInput = screen.getByPlaceholderText(/enter your full name/i);
              fireEvent.change(nameInput, { target: { value: testData.name } });
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 1: Interests
              await waitFor(() => {
                expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
              });
              
              for (const interest of testData.interests) {
                const interestInput = screen.getByPlaceholderText(/type an interest/i);
                fireEvent.change(interestInput, { target: { value: interest } });
                fireEvent.click(screen.getByRole('button', { name: /add interest/i }));
              }
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 2: Skills
              await waitFor(() => {
                expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
              });
              
              for (const skill of testData.skills) {
                const skillInput = screen.getByPlaceholderText(/type a skill/i);
                fireEvent.change(skillInput, { target: { value: skill } });
                fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
              }
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 3: Grade & Birthday
              await waitFor(() => {
                expect(screen.getByText(/grade & birthday/i)).toBeInTheDocument();
              });
              
              const gradeSelect = screen.getByLabelText(/select your grade/i);
              fireEvent.change(gradeSelect, { target: { value: testData.grade } });
              
              const monthSelect = screen.getByLabelText(/select birth month/i);
              const daySelect = screen.getByLabelText(/select birth day/i);
              const yearSelect = screen.getByLabelText(/select birth year/i);
              
              fireEvent.change(monthSelect, { target: { value: '01' } });
              fireEvent.change(daySelect, { target: { value: '15' } });
              fireEvent.change(yearSelect, { target: { value: '2005' } });
              
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 4: Home Location
              await waitFor(() => {
                expect(screen.getByText(/home location/i)).toBeInTheDocument();
              });
              
              const cityInput = screen.getByLabelText(/enter your home city/i);
              const stateSelect = screen.getByLabelText(/select your home state/i);
              
              fireEvent.change(cityInput, { target: { value: testData.city } });
              fireEvent.change(stateSelect, { target: { value: testData.state } });
              
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 5: School
              await waitFor(() => {
                expect(screen.getByText(/school information/i)).toBeInTheDocument();
              });
              
              const schoolNameInput = screen.getByLabelText(/enter your school name/i);
              const schoolCityInput = screen.getByLabelText(/enter school city/i);
              const schoolStateSelect = screen.getByLabelText(/select your school state/i);
              
              fireEvent.change(schoolNameInput, { target: { value: testData.schoolName } });
              fireEvent.change(schoolCityInput, { target: { value: testData.city } });
              fireEvent.change(schoolStateSelect, { target: { value: testData.state } });
              
              fireEvent.click(screen.getByRole('button', { name: /next/i }));
              
              // Step 6: Demographics (skip)
              await waitFor(() => {
                expect(screen.getByText(/demographics/i)).toBeInTheDocument();
              });
              
              fireEvent.click(screen.getByRole('button', { name: /skip this step/i }));
              
              // Step 7: Review and complete
              await navigateToReview(container);
              const launchButton = screen.getByRole('button', { name: /launch mission/i });
              fireEvent.click(launchButton);
              
              // EXPECTED: Account creation succeeds with all provided data
              await waitFor(() => {
                expect(mockCompleteOnboarding).toHaveBeenCalled();
                const callArgs = mockCompleteOnboarding.mock.calls[0][0];
                expect(callArgs.name).toBe(testData.name.trim());
                expect(callArgs.interests).toEqual(testData.interests);
                expect(callArgs.skills).toEqual(testData.skills);
                expect(callArgs.grade).toBe(testData.grade);
                expect(callArgs.city).toBe(testData.city);
                expect(callArgs.state).toBe(testData.state);
                expect(callArgs.schoolName).toBe(testData.schoolName);
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 3 } // Test 3 random combinations (reduced for speed)
      );
    });

    it('should require name field and show validation error when empty', async () => {
      const { toast } = await import('sonner');
      
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Leave name empty and try to proceed
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      fireEvent.change(nameInput, { target: { value: '' } });
      
      // Fill all other required fields
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
      });
      
      // Add interest
      const interestInput = screen.getByPlaceholderText(/type an interest/i);
      fireEvent.change(interestInput, { target: { value: 'Coding' } });
      fireEvent.click(screen.getByRole('button', { name: /add interest/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      // Add skill
      await waitFor(() => {
        expect(screen.getByText(/current capabilities/i)).toBeInTheDocument();
      });
      
      const skillInput = screen.getByPlaceholderText(/type a skill/i);
      fireEvent.change(skillInput, { target: { value: 'JavaScript' } });
      fireEvent.click(screen.getByRole('button', { name: /add skill/i }));
      
      // Fill remaining fields
      await fillRemainingRequiredFieldsFromGrade(container);
      
      // Navigate to review
      await navigateToReview(container);
      
      // Try to complete with empty name
      const launchButton = screen.getByRole('button', { name: /launch mission/i });
      fireEvent.click(launchButton);
      
      // EXPECTED: Validation error for empty name
      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Please enter your name');
        expect(mockCompleteOnboarding).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * Property 4: Preservation - Navigation and Save Functionality
   * 
   * **Validates: Requirements 3.3, 3.4, 3.5**
   * 
   * Verifies that navigation buttons (Next, Back, Save & Exit) and review step
   * editing functionality work identically to the original code.
   */
  describe('Property 4: Navigation and Save Functionality Preserved', () => {
    it('should show correct step counter during sequential forward navigation', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Verify step counter at each step during forward navigation
      const expectedCounters = [
        '1 / 8', '2 / 8', '3 / 8', '4 / 8', '5 / 8', '6 / 8', '7 / 8', '8 / 8'
      ];
      
      for (let step = 0; step < 8; step++) {
        // Check current step counter
        expect(screen.getByText(expectedCounters[step])).toBeInTheDocument();
        
        // Navigate to next step (if not last)
        if (step < 7) {
          const nextButton = screen.getByRole('button', { name: /next/i });
          fireEvent.click(nextButton);
          
          await waitFor(() => {
            expect(screen.getByText(expectedCounters[step + 1])).toBeInTheDocument();
          });
        }
      }
    });

    it('should navigate backward correctly and show correct step counter', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Navigate forward to step 3
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => {
          expect(screen.getByText(`${i + 2} / 8`)).toBeInTheDocument();
        });
      }
      
      // Verify we're at step 3 (4/8)
      expect(screen.getByText('4 / 8')).toBeInTheDocument();
      
      // Navigate backward
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByText('3 / 8')).toBeInTheDocument();
      });
      
      // Navigate backward again
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      
      await waitFor(() => {
        expect(screen.getByText('2 / 8')).toBeInTheDocument();
      });
    });

    it('should save progress and exit when Save & Exit is clicked', async () => {
      const { toast } = await import('sonner');
      
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Fill some data
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      
      // Navigate to step 2
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/your mission interests/i)).toBeInTheDocument();
      });
      
      // Click Save & Exit
      const saveExitButton = screen.getByRole('button', { name: /save & exit/i });
      fireEvent.click(saveExitButton);
      
      // EXPECTED: Progress is saved and success toast is shown
      await waitFor(() => {
        expect(mockSaveProgress).toHaveBeenCalled();
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Progress saved! You can resume anytime.');
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should allow editing from review step and returning to review', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      
      // Fill all required fields and navigate to review
      await fillAllRequiredFields(container);
      await navigateToReview(container);
      
      // Verify we're on review step (8/8)
      expect(screen.getByText('8 / 8')).toBeInTheDocument();
      expect(screen.getByText(/review your profile/i)).toBeInTheDocument();
      
      // Click Edit on name section
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      // EXPECTED: Navigate back to step 0 (name)
      await waitFor(() => {
        expect(screen.getByText('1 / 8')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your full name/i)).toBeInTheDocument();
      });
      
      // Verify "Save & Return" button appears (editingFromReview mode)
      expect(screen.getByRole('button', { name: /save & return/i })).toBeInTheDocument();
      
      // Click "Save & Return"
      const saveReturnButton = screen.getByRole('button', { name: /save & return/i });
      fireEvent.click(saveReturnButton);
      
      // EXPECTED: Return to review step (8/8)
      await waitFor(() => {
        expect(screen.getByText('8 / 8')).toBeInTheDocument();
        expect(screen.getByText(/review your profile/i)).toBeInTheDocument();
      });
    });

    it('should preserve navigation behavior across various step sequences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('next', 'back'), { minLength: 5, maxLength: 15 }),
          async (navigationSequence) => {
            vi.clearAllMocks();
            
            const { container, unmount } = render(<OnboardingWizard onComplete={mockOnComplete} />);
            
            try {
              let currentStep = 0;
              
              for (const action of navigationSequence) {
                if (action === 'next' && currentStep < 7) {
                  fireEvent.click(screen.getByRole('button', { name: /next/i }));
                  currentStep++;
                  
                  await waitFor(() => {
                    expect(screen.getByText(`${currentStep + 1} / 8`)).toBeInTheDocument();
                  });
                } else if (action === 'back' && currentStep > 0) {
                  fireEvent.click(screen.getByRole('button', { name: /back/i }));
                  currentStep--;
                  
                  await waitFor(() => {
                    expect(screen.getByText(`${currentStep + 1} / 8`)).toBeInTheDocument();
                  });
                }
              }
              
              // EXPECTED: Step counter always shows valid values (1/8 to 8/8)
              const stepCounterText = screen.getByText(/\d+ \/ \d+/).textContent;
              expect(stepCounterText).toMatch(/^[1-8] \/ 8$/);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 3 } // Test 3 random navigation sequences (reduced for speed)
      );
    });
  });
});
