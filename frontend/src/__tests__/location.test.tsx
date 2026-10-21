import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import LocationInput, { type Coords } from "@/components/LocationInput";

const fetchMock = jest.fn();

function Harness() {
  const [value, setValue] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  return (
    <>
      <LocationInput
        id="location"
        value={value}
        coords={coords}
        onChange={(t) => {
          setValue(t);
          setCoords(null);
        }}
        onSelect={(label, c) => {
          setValue(label);
          setCoords(c);
        }}
      />
      <output data-testid="coords">{coords ? `${coords.lat},${coords.lng}` : "none"}</output>
    </>
  );
}

const udaipur = {
  ok: true,
  json: async () => ({ results: [{ name: "Udaipur", admin1: "Rajasthan", country: "India", latitude: 24.58, longitude: 73.68 }] }),
};
const empty = { ok: true, json: async () => ({}) };

function mockGeolocation(code: number) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) => {
        fail?.({ code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      },
    },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("LocationInput", () => {
  it("shows suggestions and sets the value when one is selected", async () => {
    fetchMock.mockResolvedValue(udaipur);
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "udaipur" } });
    fireEvent.click(await screen.findByText("Udaipur, Rajasthan, India"));
    expect(screen.getByTestId("coords")).toHaveTextContent("24.58,73.68");
    expect(screen.getByText("Location confirmed")).toBeInTheDocument();
  });

  it("does not accept free text that matches no place", async () => {
    fetchMock.mockResolvedValue(empty);
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "asdfgh" } });
    expect(await screen.findByText(/No matching places/i)).toBeInTheDocument();
    expect(screen.getByTestId("coords")).toHaveTextContent("none");
  });

  it("clears the confirmed location when the user types again", async () => {
    fetchMock.mockResolvedValue(udaipur);
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "udaipur" } });
    fireEvent.click(await screen.findByText("Udaipur, Rajasthan, India"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Udaip" } });
    expect(screen.getByTestId("coords")).toHaveTextContent("none");
    expect(screen.queryByText("Location confirmed")).not.toBeInTheDocument();
  });

  it("falls back to search when location permission is denied", () => {
    mockGeolocation(1);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect(screen.getByText(/permission was denied/i)).toBeInTheDocument();
    expect(screen.getByTestId("coords")).toHaveTextContent("none");
  });
});