import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Dimensions, Modal, Button, Alert } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceMotion } from 'expo-sensors';

function GameComponent() {
  const [running, setRunning] = useState(true);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const [motionData, setMotionData] = useState(null);
  const [isMotionAvailable, setIsMotionAvailable] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Define initial ball and bat configurations
  const initialBall = {
    position: { x: width / 2 - 25, y: height / 2 },
    size: 50,
    velocity: { x: 0.1, y: 0.1 },
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: 'red',
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      );
    }
  };

  const initialBat = {
    position: { x: width / 2 - 25, y: height },
    size: 100,
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: 'green',
            position: 'absolute',
            left: position.x,
            top: height - 20,
            width: size,
            height: size / 5,
            borderRadius: size / 2,
          }}
        />
      );
    }
  };

  // Initialize entities state with initial configurations
  const [entities, setEntities] = useState({
    ball: initialBall,
    bat: initialBat
  });

  useEffect(() => {
    async function subscribe() {
      const available = await DeviceMotion.isAvailableAsync();
      setIsMotionAvailable(available);
      if (available) {
        DeviceMotion.setUpdateInterval(20);
        DeviceMotion.addListener(deviceMotionData => {
          setMotionData(deviceMotionData);
        });
      } else {
        console.log('sensor ej tilgængelig');
      }
    }
    subscribe();
    return () => {
      DeviceMotion.removeAllListeners();
    };
  }, []);

  function restartGame() {
    const resetEntities = {
      ball: {
        ...initialBall,
        position: { x: width / 2 - 25, y: height / 2 },
        velocity: { x: 0.1, y: 0.1 },
      },
      bat: {
        ...initialBat,
        position: { x: width / 2 - 25, y: height },
      }
    };

    setEntities(resetEntities);
    setRunning(false);
    requestAnimationFrame(() => {
      setRunning(true);
    });
  }

  function update(entities, { time }) {
    const ballEntity = entities.ball;
    const batEntity = entities.bat;

    ballEntity.position.x += ballEntity.velocity.x * time.delta;
    ballEntity.position.y += ballEntity.velocity.y * time.delta;

    // Right wall collision
    if (ballEntity.position.x + ballEntity.size > width) {
      ballEntity.velocity.x = -1 * Math.abs(ballEntity.velocity.x);
    }
    // Left wall collision
    if (ballEntity.position.x < 0) {
      ballEntity.velocity.x = Math.abs(ballEntity.velocity.x);
    }

    // Top wall collision
    if (ballEntity.position.y < 0) {
      ballEntity.velocity.y = Math.abs(ballEntity.velocity.y);
    }

    // Ball and bat collision detection
    const ballBottom = ballEntity.position.y + ballEntity.size;
    const batTop = height - 20;
    const ballLeft = ballEntity.position.x;
    const ballRight = ballEntity.position.x + ballEntity.size;
    const batLeft = batEntity.position.x;
    const batRight = batEntity.position.x + batEntity.size;

    // Check if ball has reached bat level
    if (ballBottom >= batTop) {
      // Check if ball hits the bat
      if (ballLeft < batRight && ballRight > batLeft) {
        ballEntity.velocity.y = -1 * Math.abs(ballEntity.velocity.y);
      } else {
        // Game over if ball misses the bat
        setRunning(false);
        Alert.alert(
          "Game Over",
          "Try again?",
          [
            {
              text: "OK",
              onPress: () => {
                ballEntity.position.x = width / 2 - 25;
                ballEntity.position.y = height / 2;
                ballEntity.velocity.y = -0.1;
                setRunning(true);
              }
            }
          ]
        );
      }
    }

    // Bat movement
    let newPos = 100;
    if (isMotionAvailable && motionData) {
      newPos = 250 * motionData.rotation.gamma + 150;
    }
    if (!isNaN(newPos)) {
      batEntity.position.x = newPos;
    }

    return entities;
  }

  return (
    <View style={[{ flex: 1 }, { paddingBottom: insets.bottom }]}>
      <GameEngine
        running={running}
        entities={entities}
        systems={[update]}
        style={{ flex: 1, backgroundColor: 'white' }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameComponent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});