import { Connection } from 'post-me';
import React from 'react';
import { WorkerMethods } from '../../../worker/types';
import { freqToNote } from '../circle-chart/utils';
import { TreeAnimation, useTreeAnimation } from '../tree-animation/tree-animation';

interface PitchSetup {
  analyser?: AnalyserNode;
  audioContext?: AudioContext;
  buffer?: Float32Array;
}
interface PitchProps {
  stream: MediaStream;
  workerConnection: Connection<{}, WorkerMethods, {}>;
  detectorName: 'autocorrelation' | 'mcleod';
  windowSize: number;
  powerThreshold: number;
  clarityThreshold: number;
  enabled: boolean;
  pitchRenderer: React.ComponentType<{
    freq: number | null;
    clarity: number | null;
  }>;
}

export function PitchMonitor({
  stream,
  detectorName,
  workerConnection,
  windowSize,
  powerThreshold,
  clarityThreshold,
  enabled,
  pitchRenderer,
}: PitchProps) {
  const [freq, setFreq] = React.useState<number | null>(null);
  const [clarity, setClarity] = React.useState<number | null>(null);
  const pendingRef = React.useRef(false);
  const pitchSetupRef = React.useRef<PitchSetup>({});
  const { setController, startRandomFlight, fly } = useTreeAnimation();

  const setupConnection = React.useCallback(async () => {
    await workerConnection
      .remoteHandle()
      .call('createDetector', detectorName, windowSize, windowSize / 2);
    const pitchSetup = pitchSetupRef.current;
    pitchSetup.buffer = new Float32Array(windowSize);
    pitchSetup.audioContext = new AudioContext();
    const mediaStreamSource = pitchSetup.audioContext.createMediaStreamSource(
      stream
    );
    pitchSetup.analyser = pitchSetup.audioContext.createAnalyser();
    pitchSetup.analyser.fftSize = windowSize;
    mediaStreamSource.connect(pitchSetup.analyser);
  }, [pitchSetupRef, windowSize, detectorName, stream, workerConnection]);

  const updatePitch = React.useCallback(async () => {
    if (!pendingRef.current) {
      pendingRef.current = true;

      const pitchSetup = pitchSetupRef.current;
      const { analyser, buffer, audioContext } = pitchSetup;
      if (!analyser || !buffer || !audioContext) {
        console.warn(
          'Trying to update the pitch, but missing an analyser/buffer/audioContext'
        );
        return;
      }
      analyser.getFloatTimeDomainData(buffer);
      const result = await workerConnection
        .remoteHandle()
        .call(
          'getPitch',
          buffer,
          audioContext.sampleRate,
          powerThreshold,
          clarityThreshold
        );
      const frequency = result[0];
      const clarity = result[1];
      if (frequency > 0) {
        setFreq(frequency);
        setClarity(clarity);
        const { note, octave } = freqToNote(frequency);
        const colorMap = {
          'C': 'yellow',
          'Db': 'orange',
          'D': 'pink',
          'Eb': 'red',
          'E': 'green',
          'F': 'darkgreen',
          'Gb': 'blue',
          'G': 'darkblue',
          'Ab': 'purple',
          'A': 'ash',
          'Bb': 'brown',
          'B': 'black'
        };
        const color = colorMap[note];
        const randomNum = octave;
        setTimeout(() => {
          console.log('Note:', note, 'Octave:', octave);
          startRandomFlight(color, randomNum);
        }, 2000);
       //startRandomFlight(color, randomNum);
      } else {
        setFreq(null);
        setClarity(null);
      }

      pendingRef.current = false;
    }
  }, [
    pendingRef,
    pitchSetupRef,
    setFreq,
    setClarity,
    startRandomFlight,
    powerThreshold,
    clarityThreshold,
    workerConnection,
  ]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    console.log('Starting audio monitoring.');
    const escape = { cancelRender: false };
    function renderFrame() {
      if (escape.cancelRender) {
        return;
      }
      requestAnimationFrame(renderFrame);
      updatePitch();
    }
    (async () => {
      await setupConnection();
      renderFrame();
    })();

    return () => {
      console.log('Stopping audio monitoring.');
      escape.cancelRender = true;
    };
  }, [setupConnection, updatePitch, enabled]);

  const PitchRenderer = pitchRenderer;
  return <TreeAnimation onReady={setController} />;
  return <PitchRenderer freq={freq} clarity={clarity} />;
}