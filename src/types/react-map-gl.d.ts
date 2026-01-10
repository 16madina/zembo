declare module 'react-map-gl' {
  import { ComponentType, ReactNode, RefObject } from 'react';

  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    padding?: { top: number; bottom: number; left: number; right: number };
  }

  export interface MapProps {
    initialViewState?: Partial<ViewState>;
    viewState?: ViewState;
    onMove?: (evt: { viewState: ViewState }) => void;
    style?: React.CSSProperties;
    mapStyle?: string;
    mapboxAccessToken?: string;
    attributionControl?: boolean;
    children?: ReactNode;
    ref?: RefObject<any>;
    onClick?: (evt: any) => void;
    onLoad?: () => void;
  }

  export interface MarkerProps {
    longitude: number;
    latitude: number;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offset?: [number, number];
    children?: ReactNode;
    onClick?: (evt: { originalEvent: MouseEvent }) => void;
  }

  export interface NavigationControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  }

  export interface GeolocateControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    trackUserLocation?: boolean;
    showUserHeading?: boolean;
    showAccuracyCircle?: boolean;
  }

  export const Map: ComponentType<MapProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const NavigationControl: ComponentType<NavigationControlProps>;
  export const GeolocateControl: ComponentType<GeolocateControlProps>;
  
  export default Map;
}

declare module 'mapbox-gl/dist/mapbox-gl.css';
