import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus, PixelRatio, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoomController } from './RoomController';
import type { ProjectedHits } from './projectedHits';
import { shouldResumeRoomOnContext } from './lifecycle';
import { roomRenderSurfaceScale, selectRoomRendererConfig } from './rendererConfig';
import type { RoomProps } from './types';

export type { RoomProps } from './types';

const RENDERER_CONFIG = selectRoomRendererConfig(__DEV__);
const RENDER_SURFACE_SCALE = roomRenderSurfaceScale(PixelRatio.get(), RENDERER_CONFIG.maxPixelRatio);
const RENDER_SURFACE_PERCENT = `${RENDER_SURFACE_SCALE * 100}%` as `${number}%`;

export function AruconRoom(props: RoomProps) {
  const insets = useSafeAreaInsets();
  const controller = useRef<RoomController | null>(null);
  const latest = useRef(props);
  const touchAccepted = useRef(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const sizeRef = useRef(size);
  const [hits, setHits] = useState<ProjectedHits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemReduced, setSystemReduced] = useState(false);
  const topLimit = insets.top + 74;
  const bottomLimit = size.height - insets.bottom - 94;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const nextSize = { width, height };
    sizeRef.current = nextSize;
    setSize(nextSize);
    controller.current?.resize(width, height);
  }, []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (controller.current) return;
    try {
      const currentSize = sizeRef.current;
      const room = new RoomController(gl, currentSize.width, currentSize.height, setHits, setError);
      controller.current = room;
      room.setPresentation({ ...latest.current, reducedMotion: systemReduced || latest.current.reducedMotion });
      void room.loadPet();
      if (shouldResumeRoomOnContext(AppState.currentState)) room.resume();
    } catch (cause) {
      setError(`방을 열지 못했어요: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [systemReduced]);

  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => { controller.current?.resize(size.width, size.height); }, [size.width, size.height]);
  useEffect(() => {
    controller.current?.setPresentation({ ...latest.current, reducedMotion: systemReduced || latest.current.reducedMotion });
  }, [props.formId, props.personality, props.sleeping, props.reducedMotion, props.tableInstalled, props.toiletInstalled, props.ballVisible, props.cushionVisible, props.mealCue, systemReduced]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setSystemReduced(enabled); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') controller.current?.resume();
      else controller.current?.pause();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => () => { controller.current?.dispose(); controller.current = null; }, []);

  const onFloor = (x: number, y: number) => {
    const room = controller.current;
    if (!room) return;
    const floor = room.screenToFloor(x, y);
    if (!floor) return;
    const target = room.moveTo(floor);
    if (target) {
      latest.current.onMove?.(target);
      latest.current.onStatus?.('아루콘이 바닥을 따라 걸어가요.');
    }
  };

  const hitVisible = (name: keyof ProjectedHits) => {
    const hit = hits?.[name];
    return !!hit?.visible && hit.y >= topLimit && hit.y <= bottomLimit;
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View pointerEvents="none" style={styles.renderSurface}>
        <GLView
          style={{
            width: RENDER_SURFACE_PERCENT,
            height: RENDER_SURFACE_PERCENT,
            transform: [{ scale: 1 / RENDER_SURFACE_SCALE }],
          }}
          msaaSamples={RENDERER_CONFIG.msaaSamples}
          onContextCreate={onContextCreate}
        />
      </View>
      <Pressable
        testID="floor-hit-area"
        accessibilityRole="button"
        accessibilityLabel="빈 바닥으로 아루콘 이동"
        style={[styles.floorHit, { top: topLimit, bottom: insets.bottom + 94 }]}
        onPress={(event) => onFloor(event.nativeEvent.locationX, event.nativeEvent.locationY + topLimit)}
      />
      {(['table', 'cushion', 'toilet', 'ball'] as const).map((name) => {
        const installed = name === 'table' ? (props.tableInstalled ?? true) : name === 'toilet' ? !!props.toiletInstalled
          : name === 'ball' ? !!props.ballVisible : !!props.cushionVisible;
        if (!installed || !hitVisible(name)) return null;
        const point = hits![name];
        return (
          <Pressable
            key={name}
            testID={`${name}-hit-area`}
            accessibilityRole="button"
            accessibilityLabel={{ table: '식탁', cushion: '쿠션', toilet: '화장실', ball: '공' }[name]}
            style={[styles.furnitureHit, { left: point.x - 26, top: point.y - 26 }]}
            onPress={() => { if (name === 'ball') controller.current?.playBall(); latest.current.onFurnitureHit?.(name); }}
          />
        );
      })}
      {hitVisible('pet') && (
        <Pressable
          testID="pet-hit-area"
          accessibilityRole="button"
          accessibilityLabel="아루콘 쓰다듬기"
          style={[styles.petHit, { left: hits!.pet.x - 37, top: hits!.pet.y - 43 }]}
          onPressIn={() => { touchAccepted.current = !!controller.current?.beginPet(); }}
          onPressOut={() => { controller.current?.endPet(); }}
          onPress={() => {
            if (!touchAccepted.current) return;
            touchAccepted.current = false;
            latest.current.onPetTouch?.();
            latest.current.onStatus?.('아루콘이 손길에 반응했어요.');
          }}
        />
      )}
      {error && <View style={[styles.error, { top: insets.top + 78 }]} accessibilityRole="alert"><Text style={styles.errorText}>{error}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2ebdc' },
  renderSurface: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  floorHit: { position: 'absolute', left: 0, right: 0 },
  petHit: { position: 'absolute', width: 74, height: 86, borderRadius: 35 },
  furnitureHit: { position: 'absolute', width: 52, height: 52, borderRadius: 26 },
  error: { position: 'absolute', left: 20, right: 20, padding: 12, borderRadius: 12, backgroundColor: '#fff9ef' },
  errorText: { color: '#614b45', textAlign: 'center' },
});
