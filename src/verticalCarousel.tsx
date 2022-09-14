import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';

const DEFAULT_DISPLAY_TIME = 3000;
const DEFAULT_ANIMATION_DURATION = 250;

interface Props<Item> {
  items: Item[];
  renderItem: (item: Item) => JSX.Element;
  viewHeight: number;
  defaultItem?: Item;
  onShow?: (item: Item, currentIndex?: number) => void;
  displayTime?: number;
  isAnimationEnabled?: boolean;
  animationDuration?: number;
  startIndex?: number;
}

/**
 * carousel vertical sliding effect
 */
function Carousel<Item extends unknown>(
  {
    items,
    renderItem,
    viewHeight,
    onShow,
    defaultItem,
    displayTime = DEFAULT_DISPLAY_TIME,
    isAnimationEnabled = true,
    animationDuration = DEFAULT_ANIMATION_DURATION,
    startIndex = 0,
  }: Props<Item>,
  ref: any,
) {
  const [copiedItems, setCopiedItems] = useState<Item[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const animatedTop = React.useRef(new Animated.Value(0)).current;
  const animationTimeout = React.useRef<any>(null);
  const isShowDefaultItemBefore = React.useRef<boolean>(false);

  useImperativeHandle(ref, () => ({
    startOver: onStartOver,
    clear: clear,
  }));

  useEffect(() => {
    init();
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const init = useCallback(() => {
    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
      animationTimeout.current = null;
    }
    const _startIndex = startIndex % items.length;
    const _copiedItems = [
      ...items.slice(_startIndex),
      ...items.slice(0, _startIndex),
    ];

    //show default item if no items
    if (!items.length && defaultItem) {
      setCopiedItems([defaultItem]);
      isShowDefaultItemBefore.current = true;
      return;
    }

    //need animate from defaultItem to items
    if (
      items.length &&
      defaultItem &&
      isAnimationEnabled &&
      isShowDefaultItemBefore.current
    ) {
      _copiedItems.unshift(defaultItem);
      setCopiedItems(_copiedItems);
      startAnimation(_copiedItems, _startIndex, 100); //animate immediately
      return;
    }

    //show normal animation
    if (items.length && isAnimationEnabled) {
      setCopiedItems(_copiedItems);
      if (onShow) {
        onShow(_copiedItems[0], startIndex);
      }
      if (items.length > 1) {
        startAnimation(_copiedItems);
      }
    }
  }, [items, isAnimationEnabled, startIndex, defaultItem]);

  const startAnimation = useCallback(
    (
      lastItems: Item[] = [],
      counter = startIndex,
      forceDisplayTime?: number,
    ) => {
      if (!isAnimationEnabled || lastItems.length <= 1) {
        return;
      }
      animationTimeout.current = setTimeout(() => {
        animationTimeout.current = null;
        beginAnimation(lastItems, counter);
      }, forceDisplayTime || displayTime);
    },
    [displayTime, isAnimationEnabled, startIndex],
  );

  const beginAnimation = useCallback(
    (lastItems: Item[] = [], counter: number) => {
      Animated.sequence([
        Animated.timing(animatedTop, {
          toValue: -viewHeight,
          isInteraction: false,
          easing: Easing.linear,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        //after done animating
        let nextIndex = (counter + 1) % lastItems.length;

        const shiftedItems = [...lastItems.slice(1), ...lastItems.slice(0, 1)];

        if (isShowDefaultItemBefore.current) {
          //remove defaultItem from copiedItems
          shiftedItems.pop();
          isShowDefaultItemBefore.current = false;
          nextIndex -= 1;
        }

        if (onShow) {
          onShow(shiftedItems[0], nextIndex);
        }

        //reset animation and shift prefill text array
        setCopiedItems(shiftedItems);
        animatedTop.setValue(0);

        if (shiftedItems.length > 1) {
          startAnimation(shiftedItems, counter + 1);
        }
      });
    },
    [animatedTop, animationDuration, viewHeight, onShow, startAnimation],
  );

  const clear = useCallback(() => {
    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
    }
  }, []);

  const onStartOver = useCallback(() => {
    clear();
    init();
  }, [clear, init]);

  return (
    <View
      style={[
        styles.root,
        {
          height: viewHeight,
        },
      ]}>
      {copiedItems.slice(0, 3).map((item, idx) => (
        <Animated.View
          key={idx}
          style={{
            transform: [
              {
                translateY: animatedTop,
              },
            ],
          }}>
          {renderItem(item)}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});

export default memo(forwardRef(Carousel));
