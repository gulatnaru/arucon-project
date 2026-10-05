import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus, PixelRatio, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoomController } from './RoomController';
import { petBubbleBounds, type ProjectedHits } from './projectedHits';
import { shouldResumeRoomOnContext } from './lifecycle';
import { roomRenderSurfaceScale, resolveRoomRendererProfile } from './rendererConfig';
import type { RoomProps } from './types';
import { PetGestureSession } from './interactionLifecycle';
import { projectPetRest } from '../presentation/petRest';

export type { RoomProps } from './types';

export function AruconRoom(props: RoomProps) {
  const insets = useSafeAreaInsets();
  const controller = useRef<RoomController | null>(null);
  const latest = useRef(props);
  const petGesture = useRef(new PetGestureSession());
  const touchTarget = useRef<'head' | 'body' | 'unknown'>('unknown');
  const [size, setSize] = useState({ width: 1, height: 1 });
  const sizeRef = useRef(size);
  const [hits, setHits] = useState<ProjectedHits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemReduced, setSystemReduced] = useState(false);
  const [bubbleHeight, setBubbleHeight] = useState(100);
  const topLimit = props.topOcclusion ?? insets.top + 74;
  const bottomLimit = size.height - (props.bottomOcclusion ?? insets.bottom + 94);
  const bubble = petBubbleBounds(hits?.pet ?? { x: size.width / 2, y: size.height / 2 }, size.width, topLimit, bottomLimit, bubbleHeight);
  const rendererProfileId = props.rendererProfileId ?? 'automatic';
  const requestedRendererProfile = useRef(rendererProfileId);
  const [effectiveRendererProfileId, setEffectiveRendererProfileId] = useState(rendererProfileId);
  const effectiveRendererProfile = useRef(rendererProfileId);
  const rendererConfig = resolveRoomRendererProfile(effectiveRendererProfileId, __DEV__, Platform.OS);
  const renderSurfaceScale = roomRenderSurfaceScale(PixelRatio.get(), rendererConfig.maxPixelRatio);
  const renderSurfacePercent = `${renderSurfaceScale * 100}%` as `${number}%`;

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
      const room = new RoomController(gl, currentSize.width, currentSize.height, setHits, setError, effectiveRendererProfileId);
      const resolvedProfileId = room.resolvedRendererProfile().id;
      if (rendererProfileId === 'automatic' && resolvedProfileId !== effectiveRendererProfileId) {
        room.dispose();
        effectiveRendererProfile.current = resolvedProfileId;
        setEffectiveRendererProfileId(resolvedProfileId);
        return;
      }
      controller.current = room;
      room.setPresentation({ ...latest.current, reducedMotion: systemReduced || latest.current.reducedMotion });
      void room.loadPet();
      if (shouldResumeRoomOnContext(AppState.currentState)) room.resume();
    } catch (cause) {
      setError(`방을 열지 못했어요: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [effectiveRendererProfileId, rendererProfileId, systemReduced]);

  useEffect(() => {
    if (requestedRendererProfile.current === rendererProfileId) return;
    requestedRendererProfile.current = rendererProfileId;
    if (effectiveRendererProfile.current === rendererProfileId) return;
    controller.current?.dispose();
    controller.current = null;
    effectiveRendererProfile.current = rendererProfileId;
    setEffectiveRendererProfileId(rendererProfileId);
  }, [rendererProfileId]);

  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => { controller.current?.resize(size.width, size.height); }, [size.width, size.height]);
  useEffect(() => {
    controller.current?.setPresentation({ ...latest.current, reducedMotion: systemReduced || latest.current.reducedMotion });
  }, [
    props.formId,
    props.personality,
    props.sleeping,
    props.restMode,
    props.reducedMotion,
    props.tableInstalled,
    props.toiletInstalled,
    props.ballVisible,
    props.cushionVisible,
    props.mealCue,
    props.interactionEnabled,
    props.characterCandidateId,
    props.comparisonCameraAngle,
    props.comparisonStretchProgress,
    props.reactionPresentation,
    props.lifeCommand,
    props.livingEnabled,
    props.onLifeEvent,
    props.lifePreference,
    props.growthStage,
    props.previewFormId,
    props.growthLevel,
    props.lowEnergy,
    props.poopCount,
    props.hungry,
    props.mealAvailability,
    props.performanceCaptureToken,
    props.onPerformanceCapture,
    props.onRuntimeSnapshot,
    systemReduced,
  ]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setSystemReduced(enabled); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') controller.current?.resume();
      else {
        petGesture.current.cancel();
        controller.current?.pause();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    petGesture.current.cancel();
    controller.current?.cancelPet();
    controller.current?.dispose();
    controller.current = null;
  }, []);

  useEffect(() => {
    if (props.interactionEnabled ?? true) return;
    petGesture.current.cancel();
    controller.current?.cancelPet();
  }, [props.interactionEnabled]);

  const onFloor = (x: number, y: number) => {
    if (!(latest.current.interactionEnabled ?? true)) return;
    const room = controller.current;
    if (!room) return;
    const floor = room.screenToFloor(x, y);
    if (!floor) return;
    if (latest.current.ballPlayInput) {
      room.runLife({ token: `roll:${performance.now()}`, kind: 'roll', target: floor });
      return;
    }
    const target = room.moveTo(floor);
    if (target) {
      latest.current.onInteractionIntent?.('move');
      latest.current.onMove?.(target);
    }
  };

  const hitVisible = (name: keyof ProjectedHits) => {
    const hit = hits?.[name];
    return !!hit?.visible && hit.y >= topLimit && hit.y <= bottomLimit;
  };
  const blockedPetHint = () => projectPetRest({ sleeping: latest.current.restMode === 'sleeping',
    hibernating: latest.current.restMode === 'hibernating' }).hint ?? '지금 하던 행동이 끝나면 쓰다듬을 수 있어요.';

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View pointerEvents="none" style={styles.renderSurface}>
        <GLView
          key={effectiveRendererProfileId}
          style={{
            width: renderSurfacePercent,
            height: renderSurfacePercent,
            transform: [{ scale: 1 / renderSurfaceScale }],
          }}
          msaaSamples={rendererConfig.msaaSamples}
          onContextCreate={onContextCreate}
        />
      </View>
      <Pressable
        testID="floor-hit-area"
        accessibilityRole="button"
        accessibilityLabel="빈 바닥으로 아루콘 이동"
        style={[styles.floorHit, { top: topLimit, bottom: props.bottomOcclusion ?? insets.bottom + 94 }]}
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
            onPress={() => {
              const room = controller.current;
              const accepted = name === 'ball' && !latest.current.livingEnabled ? room?.playBall() : room?.canStartReactionCue();
              if (!accepted) return;
              latest.current.onInteractionIntent?.('furniture');
              latest.current.onFurnitureHit?.(name);
            }}
          />
        );
      })}
      {hitVisible('pet') && (
        <Pressable
          testID="pet-hit-area"
          accessibilityRole="button"
          accessibilityLabel="아루콘 쓰다듬기"
          style={[styles.petHit, { left: hits!.pet.x - 37, top: hits!.pet.y - 43 }]}
          onTouchStart={(event) => {
            if (event.nativeEvent.touches.length <= 1) return;
            petGesture.current.cancel();
            controller.current?.cancelPet();
          }}
          onTouchCancel={() => {
            petGesture.current.cancel();
            controller.current?.cancelPet();
          }}
          onPressIn={(event) => {
            touchTarget.current = event.nativeEvent.locationY < 36 ? 'head' : 'body';
            const room = controller.current;
            const startedAtMs = performance.now();
            const result = petGesture.current.begin(
              event.nativeEvent.identifier,
              event.nativeEvent.touches.length,
              () => !!room?.beginPet(startedAtMs),
            );
            if (result === 'started') latest.current.onInteractionIntent?.('pet');
            if (result === 'rejected') latest.current.onStatus?.(blockedPetHint());
          }}
          onPressOut={(event) => {
            const result = petGesture.current.end(event.nativeEvent.identifier);
            if (result === 'ended') controller.current?.endPet();
          }}
          onPress={() => {
            const activationStartedAtMs = performance.now();
            if (!(latest.current.interactionEnabled ?? true)) return;
            const room = controller.current;
            const activation = petGesture.current.activate();
            if (activation === 'ignored') return;
            if (activation === 'committed_active') room?.endPet();
            if (activation === 'accessible_activation') {
              if (!room?.beginAccessiblePet(activationStartedAtMs)) {
                latest.current.onStatus?.(blockedPetHint());
                return;
              }
              latest.current.onInteractionIntent?.('pet');
            }
            latest.current.onPetTouch?.(activation === 'accessible_activation' ? 'unknown' : touchTarget.current);
          }}
        />
      )}
      {!!props.poopCount && hits?.cleanup?.visible && <Pressable accessibilityRole="button" accessibilityLabel="남아 있는 배설물 치우기"
        style={[styles.furnitureHit, { left: hits.cleanup.x - 26, top: hits.cleanup.y - 26 }]}
        onPress={() => { if (latest.current.interactionEnabled ?? true) latest.current.onCleanup?.(); }} />}
      {!!props.reactionBubble && hits?.pet.visible && bubble.maxHeight > 0 && <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: bubble.left, top: bubble.top, width: bubble.width, maxHeight: bubble.maxHeight }}
      >
        <View onLayout={event => setBubbleHeight(event.nativeEvent.layout.height)} style={{ maxHeight: bubble.maxHeight }}>
          {props.reactionBubble}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: bubble.tailLeft,
          ...(bubble.below ? { top: -7, transform: [{ rotate: '180deg' }] } : { bottom: -7 }),
          borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff9ed' }} />
      </View>}
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
