import { act, fireEvent, render, screen } from "@testing-library/react";
import PostRequirementPage from "@/app/post-requirement/page";
import { useWizardStore } from "@/store/wizardStore";

jest.mock("@/lib/api", () => ({ createRequirement: jest.fn() }));

function fillBasics(category: RegExp) {
  fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: "Royal Palace Gala" } });
  fireEvent.click(screen.getByLabelText(/event type/i));
  fireEvent.click(screen.getByRole("option", { name: "Wedding" }));
  fireEvent.change(screen.getByLabelText(/event date/i), { target: { value: "2099-01-01" } });
  act(() => { useWizardStore.getState().setBasics({ location: "Udaipur, Rajasthan, India", locationCoords: { lat: 24.58, lng: 73.68 } }); });
  fireEvent.click(screen.getByRole("button", { name: category }));
}

const clickNext = () => fireEvent.click(screen.getByRole("button", { name: /next/i }));

beforeEach(() => {
  sessionStorage.clear();
  useWizardStore.getState().reset();
});

describe("requirement wizard", () => {
  it("shows validation errors when step 1 is empty", () => {
    render(<PostRequirementPage />);
    clickNext();
    expect(screen.getByText("Event name must be at least 3 characters")).toBeInTheDocument();
    expect(screen.getByText("Select a category")).toBeInTheDocument();
  });

  it("moves to step 2 and shows planner fields", () => {
    render(<PostRequirementPage />);
    fillBasics(/planner/i);
    clickNext();
    expect(screen.getByLabelText(/guest count/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/headcount/i)).not.toBeInTheDocument();
  });

  it("shows crew fields when crew is selected", () => {
    render(<PostRequirementPage />);
    fillBasics(/crew/i);
    clickNext();
    expect(screen.getByLabelText(/headcount/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/guest count/i)).not.toBeInTheDocument();
  });

  it("blocks Next on step 2 until category fields are valid", () => {
    render(<PostRequirementPage />);
    fillBasics(/performer/i);
    clickNext();
    clickNext();
    expect(screen.getByText("Genre is required")).toBeInTheDocument();
  });

  it("clears category data and shows a notice when the category changes", () => {
    render(<PostRequirementPage />);
    fillBasics(/planner/i);
    clickNext();
    fireEvent.change(screen.getByLabelText(/guest count/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    fireEvent.click(screen.getByRole("button", { name: /crew/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/cleared/i);
  });
});
describe("location validation", () => {
  it("blocks Next when the location wasn't picked from the suggestions", () => {
    render(<PostRequirementPage />);
    fillBasics(/planner/i);
    act(() => {
      useWizardStore.getState().setBasics({ locationCoords: null });
    });
    clickNext();
    expect(screen.getByText("Select a location from the suggestions")).toBeInTheDocument();
  });
});
