"use client";

import { Microphone, MicrophoneSlash, SpeakerHigh, WarningCircle } from "@phosphor-icons/react";
import {
  createLocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type RemoteTrack,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createVoiceToken } from "@/lib/api/generated/sdk.gen";
import { client } from "@/lib/api/client";
import { storedVoiceDeviceId } from "@/lib/voice-preferences";

type VoiceState = "connecting" | "ready" | "talking" | "error";

interface VoiceParticipant {
  id: string;
  local: boolean;
  name: string;
}

interface VoiceChatProps {
  participantName: string;
  serverId: string;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

function voiceErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone permission was denied.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Voice chat could not connect.";
}

export function VoiceChat({ participantName, serverId }: VoiceChatProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("connecting");
  const [participants, setParticipants] = useState<VoiceParticipant[]>([
    { id: "local", local: true, name: participantName },
  ]);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [error, setError] = useState<string>();
  const roomRef = useRef<Room | undefined>(undefined);
  const microphoneRef = useRef<LocalAudioTrack | undefined>(undefined);
  const pressedRef = useRef(false);
  const textInputActiveRef = useRef(false);

  const stopTalking = useCallback(() => {
    pressedRef.current = false;
    setVoiceState((current) => current === "talking" ? "ready" : current);
    void microphoneRef.current?.mute().catch(() => undefined);
  }, []);

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;
    let cancelled = false;
    const audioElements = new Map<RemoteTrack, HTMLMediaElement>();

    const removeAudioUnlockListeners = () => {
      window.removeEventListener("pointerdown", unlockAudioFromGesture, true);
      window.removeEventListener("keydown", unlockAudioFromGesture, true);
    };
    const unlockAudioFromGesture = () => {
      void room.startAudio()
        .then(() => {
          if (!cancelled) setPlaybackBlocked(false);
          removeAudioUnlockListeners();
        })
        .catch(() => {
          if (!cancelled) setPlaybackBlocked(true);
        });
    };

    window.addEventListener("pointerdown", unlockAudioFromGesture, true);
    window.addEventListener("keydown", unlockAudioFromGesture, true);

    const updateParticipants = () => {
      const localParticipant = room.localParticipant;
      setParticipants([
        {
          id: localParticipant.identity || "local",
          local: true,
          name: localParticipant.name?.trim() || participantName,
        },
        ...Array.from(room.remoteParticipants.values()).map((participant) => ({
          id: participant.identity,
          local: false,
          name: participant.name?.trim() || participant.identity,
        })),
      ]);
    };
    const attachRemoteAudio = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (audioElements.has(track)) return;
      const element = track.attach();
      element.autoplay = true;
      element.muted = false;
      element.volume = 1;
      element.hidden = true;
      element.dataset.q3jsVoice = "true";
      document.body.appendChild(element);
      audioElements.set(track, element);
      void element.play()
        .then(() => {
          if (!cancelled) setPlaybackBlocked(false);
        })
        .catch(() => {
          if (!cancelled) setPlaybackBlocked(true);
        });
    };
    const detachRemoteAudio = (track: RemoteTrack) => {
      track.detach().forEach((element) => {
        element.remove();
      });
      audioElements.delete(track);
    };
    const updatePlaybackState = () => setPlaybackBlocked(!room.canPlaybackAudio);

    room.on(RoomEvent.TrackSubscribed, attachRemoteAudio);
    room.on(RoomEvent.TrackUnsubscribed, detachRemoteAudio);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.ParticipantNameChanged, updateParticipants);
    room.on(RoomEvent.AudioPlaybackStatusChanged, updatePlaybackState);

    const connect = async () => {
      try {
        const { data: credentials } = await createVoiceToken({
          client,
          body: { serverId, participantName },
        });

        await room.connect(credentials.server_url, credentials.participant_token, {
          autoSubscribe: true,
        });
        if (cancelled) {
          await room.disconnect();
          return;
        }

        room.remoteParticipants.forEach((participant) => {
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.track) attachRemoteAudio(publication.track);
          });
        });

        const deviceId = storedVoiceDeviceId();
        const microphone = await createLocalAudioTrack({
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        });
        await microphone.mute();
        if (cancelled) {
          microphone.stop();
          await room.disconnect();
          return;
        }
        microphoneRef.current = microphone;
        await room.localParticipant.publishTrack(microphone, {
          source: Track.Source.Microphone,
        });
        updateParticipants();
        updatePlaybackState();
        setVoiceState("ready");
      } catch (connectError) {
        if (cancelled) return;
        microphoneRef.current?.stop();
        microphoneRef.current = undefined;
        void room.disconnect();
        setError(voiceErrorMessage(connectError));
        setVoiceState("error");
      }
    };

    void connect();

    return () => {
      cancelled = true;
      pressedRef.current = false;
      const microphone = microphoneRef.current;
      microphoneRef.current = undefined;
      removeAudioUnlockListeners();
      void microphone?.mute().catch(() => undefined);
      microphone?.stop();
      audioElements.forEach((element) => element.remove());
      audioElements.clear();
      room.removeAllListeners();
      void room.disconnect();
      roomRef.current = undefined;
    };
  }, [participantName, serverId]);

  useEffect(() => {
    const startTalking = (event: KeyboardEvent) => {
      if (
        event.code !== "KeyK"
        || event.repeat
        || textInputActiveRef.current
        || isEditableTarget(event.target)
      ) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!microphoneRef.current) return;

      pressedRef.current = true;
      setVoiceState("talking");
      void roomRef.current?.startAudio().catch(() => undefined);
      void microphoneRef.current.unmute()
        .then(() => {
          if (!pressedRef.current) {
            void microphoneRef.current?.mute().catch(() => undefined);
          }
        })
        .catch((talkError: unknown) => {
          pressedRef.current = false;
          setError(voiceErrorMessage(talkError));
          setVoiceState("error");
        });
    };
    const endTalking = (event: KeyboardEvent) => {
      if (
        event.code !== "KeyK"
        || textInputActiveRef.current
        || isEditableTarget(event.target)
      ) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stopTalking();
    };
    const handleTextInputActiveChange = (event: Event) => {
      const active = event instanceof CustomEvent && event.detail === true;
      textInputActiveRef.current = active;
      if (active) stopTalking();
    };
    const handleVisibility = () => {
      if (document.hidden) stopTalking();
    };

    window.addEventListener("keydown", startTalking, true);
    window.addEventListener("keyup", endTalking, true);
    window.addEventListener("q3js:text-input-active-change", handleTextInputActiveChange);
    window.addEventListener("blur", stopTalking);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", startTalking, true);
      window.removeEventListener("keyup", endTalking, true);
      window.removeEventListener("q3js:text-input-active-change", handleTextInputActiveChange);
      window.removeEventListener("blur", stopTalking);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTalking();
    };
  }, [stopTalking]);

  const enablePlayback = async () => {
    await roomRef.current?.startAudio().catch(() => undefined);
    setPlaybackBlocked(!(roomRef.current?.canPlaybackAudio ?? false));
  };

  return (
    <aside className="pointer-events-none absolute right-3 top-3 z-20 max-w-[min(22rem,calc(100%-1.5rem))] border border-white/20 bg-black/75 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.08em]">
        {voiceState === "talking" ? (
          <Microphone className="size-4 text-green-400" weight="fill" aria-hidden="true" />
        ) : voiceState === "error" ? (
          <WarningCircle className="size-4 text-primary" weight="fill" aria-hidden="true" />
        ) : (
          <MicrophoneSlash className="size-4 text-white/70" aria-hidden="true" />
        )}
        <span>
          {voiceState === "connecting" && "Voice connecting"}
          {voiceState === "ready" && "Hold K to talk"}
          {voiceState === "talking" && "Transmitting"}
          {voiceState === "error" && "Voice unavailable"}
        </span>
        {voiceState !== "error" && (
          <span className="text-white/55">{participants.length} in room</span>
        )}
      </div>

      {voiceState !== "error" && participants.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/15 pt-2 font-mono text-xs normal-case">
          {participants.map((participant) => (
            <li key={participant.id} className="flex min-w-0 items-center gap-1.5 text-white/75">
              <span className="size-1.5 shrink-0 bg-green-400" aria-hidden="true" />
              <span className="max-w-40 truncate">{participant.name}</span>
              {participant.local && <span className="text-white/40">(you)</span>}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs normal-case leading-4 text-white/65">{error}</p>}
      {playbackBlocked && voiceState !== "error" && (
        <button
          type="button"
          className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 border border-white/30 px-2 py-1 font-mono text-xs uppercase hover:bg-white/10"
          onClick={() => void enablePlayback()}
        >
          <SpeakerHigh className="size-3.5" />
          Enable voice audio
        </button>
      )}
    </aside>
  );
}
