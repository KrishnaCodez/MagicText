import React, { useEffect, useRef, useState } from "react"
import { Canvas, FabricImage, PencilBrush } from "fabric"
import * as fabric from "fabric"
import { useWindow } from "@/hooks/use-window"
import { filterNames, getFilter } from "@/lib/constants"
import { removeBackground } from "@imgly/background-removal";

const CANVAS_DIMENSIONS = { default: 500, mobileMultiplier: 0.9 }
const DEFAULT_BACKGROUND_COLOR = "#005DFF"
const DEFAULT_FONT_COLOR = "#ffffff"
const DEFAULT_FONT_FAMILY = "Shrikhand"
const DEFAULT_TEXT_OPTIONS = {
  text: "edit",
  fontSize: 150,
  fontFamily: DEFAULT_FONT_FAMILY,
  fill: DEFAULT_FONT_COLOR,
  stroke: "black",
  strokeWidth: 1.5,
  textAlign: "center",
}
const loadingMessages = [
  { threshold: 5, message: "Initializing...", time: 0 },
  { threshold: 15, message: "Starting background removal...", time: 2000 },
  { threshold: 30, message: "Processing image...", time: 4000 },
  { threshold: 45, message: "Analyzing details...", time: 6000 },
  { threshold: 60, message: "Removing background...", time: 8000 },
  { threshold: 75, message: "Enhancing edges...", time: 10000 },
  { threshold: 85, message: "Almost done...", time: 12000 },
  { threshold: 95, message: "Finalizing...", time: 14000 }
];

export interface selectedTextPropertiesProps {
  fontFamily: string
  fontColor: string
  isTextSelected: boolean
}

export interface DrawingPropertiesProps {
  isDrawing: boolean
  brushSize: number
  brushColor: string
}

export interface strokeSettingsProps {
  color: string;
  width: number;
  enabled: boolean;
}

export function useFabric() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<Canvas | null>(null)
  const [currentBackgroundColor, setCurrentBackgroundColor] =
    React.useState<string>(DEFAULT_BACKGROUND_COLOR)
  const [selectedTextProperties, setSelectedTextProperties] =
    React.useState<selectedTextPropertiesProps>({
      fontFamily: DEFAULT_FONT_FAMILY,
      fontColor: DEFAULT_FONT_COLOR,
      isTextSelected: false,
    })
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0].message);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [removedBgLayer, setRemovedBgLayer] = React.useState<FabricImage | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [isObjectSelected, setIsObjectSelected] = useState(false);

  const [isImageSelected, setIsImageSelected] = useState<boolean>(false)
  const [currentFilterIndex, setCurrentFilterIndex] = useState<number>(0)
  const { isMobile, windowSize } = useWindow()
  const [showStrokeUI, setShowStrokeUI] = useState(false);

  const [strokeSettings, setStrokeSettings] = useState({
    color: '#000000',
    width: 1.5,
    enabled: false
  });

  const [drawingSettings, setDrawingSettings] =
    useState<DrawingPropertiesProps>({
      isDrawing: false,
      brushSize: 4,
      brushColor: "#ffffff",
    })

  useEffect(() => {
    if (!canvasRef.current) return

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true, // Enable selection
      interactive: true // Enable interaction


    })


    setCanvas(fabricCanvas)
    fabricCanvas.backgroundColor = currentBackgroundColor

    // Add a listener for when an object is added to the canvas
    fabricCanvas.on("object:added", (e) => {
      const object = e.target
      if (object) {
        object.set({
          cornerColor: "#FFF",
          cornerStyle: "rect",
          borderColor: "#3D78FF",
          cornerSize: 10,
          transparentCorners: false,
          borderOpacityWhenMoving: 0,
          cornerStrokeColor: "#3D78FF",
        })
        fabricCanvas.on('selection:created', () => {
          fabricCanvas.requestRenderAll()
        })

        fabricCanvas.on('object:modified', () => {
          fabricCanvas.requestRenderAll()
        })


        // TODO: MAKE IT MORE LIKE CANVA SELECTOR

        // Define custom controls
        object.controls = {
          ...object.controls,
          mtr: new fabric.Control({
            x: 0,
            y: -0.58,
            offsetY: -30,
            cursorStyle: "grab",
            actionName: "rotate",
            actionHandler: fabric.controlsUtils.rotationWithSnapping,
          }),
        }

        fabricCanvas.renderAll()
      }
    })

    // Add listeners for object selection and deselection
    const updateSelectedProperties = () => {
      const activeObject = fabricCanvas.getActiveObject()


      if (activeObject && activeObject.type === "textbox") {
        setSelectedTextProperties({
          fontFamily: activeObject.get("fontFamily") as string,
          fontColor: activeObject.get("fill") as string,
          isTextSelected: true,
        })
      } else {
        setSelectedTextProperties({
          fontFamily: DEFAULT_FONT_FAMILY,
          fontColor: DEFAULT_FONT_COLOR,
          isTextSelected: false,
        })
      }

      if (activeObject) {
        // console.log('Object selected');
        setIsObjectSelected(true);
        // console.log(isObjectSelected);
      }
      // Update image selection state
      if (activeObject && activeObject.type === "image") {
        setIsImageSelected(true)
      } else {
        setIsImageSelected(false)
      }
    }



    // Load the brush for drawing
    fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas)
    fabricCanvas.freeDrawingBrush.color = drawingSettings.brushColor
    fabricCanvas.freeDrawingBrush.width = drawingSettings.brushSize

    // Listen to multiple events that might change selection
    fabricCanvas.on("selection:created", updateSelectedProperties)
    fabricCanvas.on("selection:updated", updateSelectedProperties)
    fabricCanvas.on("selection:cleared", () => {
      updateSelectedProperties();
      setIsObjectSelected(false);
    });
    // Add a listener for object modifications
    fabricCanvas.on("object:modified", updateSelectedProperties)


    return () => {
      // Remove event listeners
      fabricCanvas.off("selection:created", updateSelectedProperties)
      fabricCanvas.off("selection:updated", updateSelectedProperties)
      fabricCanvas.off("selection:cleared", updateSelectedProperties)
      fabricCanvas.off("object:modified", updateSelectedProperties)
      fabricCanvas.dispose()
    }
  }, [])


  useEffect(() => {
    if (!canvas) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && canvas.getActiveObject()) {
        deleteSelectedObject()
      }
    }

    // Add event listener to the window
    window.addEventListener("keydown", handleKeyDown)

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [canvas, deleteSelectedObject])

  useEffect(() => {
    if (!canvas) return
    canvas.isDrawingMode = drawingSettings.isDrawing
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = drawingSettings.brushColor
      canvas.freeDrawingBrush.width = drawingSettings.brushSize
    }
    canvas.renderAll()
  }, [drawingSettings, canvas])




  function addText() {
    if (!canvas) return

    const text = new fabric.Textbox(DEFAULT_TEXT_OPTIONS.text, {
      ...DEFAULT_TEXT_OPTIONS,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      width: canvas.getWidth() * 0.1,
      originX: "center",
      originY: "center",
      selectable: true,
      evented: true,
      strokeWidth: 0,
      stroke: '',
      lockMovementX: false,
      lockMovementY: false,
      hasControls: true,
      hasBorders: true,
      padding: 4,
      splitByGrapheme: false,
      lockUniScaling: true, // Maintain aspect ratio when scaling
      centeredScaling: true,

    })

    // Add text first
    canvas.add(text)

    // If we have a removed background layer, ensure proper ordering

    canvas.setActiveObject(text)
    canvas.sendObjectToBack(text)

    canvas.renderAll()
  }


  function changeFontFamily(fontFamily: string) {
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox
      text.set("fontFamily", fontFamily)

      // Immediately update the selected text properties
      setSelectedTextProperties((prev) => ({
        ...prev,
        fontFamily: fontFamily,
      }))

      canvas.renderAll()
    }
  }



  function removeStroke() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox;

      text.set({
        stroke: '',
        strokeWidth: 0
      });

      setStrokeSettings(prev => ({
        ...prev,
        enabled: false
      }));

      setShowStrokeUI(false);
      canvas.renderAll();
    }
  }

  function addStroke() {
    if (!canvas) return;

    setShowStrokeUI(prev => !prev);

    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox;

      setStrokeSettings(prev => {
        const enabled = !prev.enabled;

        text.set({
          stroke: enabled ? prev.color : '',
          strokeWidth: enabled ? prev.width : 0
        });

        canvas.renderAll();

        return {
          ...prev,
          enabled
        };
      });
    }
  }


  function updateStrokeColor(color: string) {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox;
      text.set("stroke", color);

      setStrokeSettings(prev => ({
        ...prev,
        color,
        enabled: true
      }));

      canvas.renderAll();
    }
  }

  function updateStrokeWidth() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox;

      setStrokeSettings(prev => {
        let newWidth = prev.width + 0.5;
        if (newWidth > 5) {
          newWidth = 0.5;
        }

        text.set("strokeWidth", newWidth);
        canvas.renderAll();

        return {
          ...prev,
          width: newWidth,
          enabled: true
        };
      });
    }
  }

  function changeTextColor(color: string) {
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "textbox") {
      const text = activeObject as fabric.Textbox
      text.set("fill", color)

      // Immediately update the selected text properties
      setSelectedTextProperties((prev) => ({
        ...prev,
        fontColor: color,
      }))

      canvas.renderAll()
    }
  }


  // Add inside useFabric() function
  async function handleImageUpload(file: File): Promise<void> {
    try {
      setIsLoading(true)
      setUploadProgress(0)

      const imageUrl = URL.createObjectURL(file)
      const startTime = Date.now();
      let currentIndex = 0;

      const progressInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;

        if (currentIndex < loadingMessages.length &&
          elapsedTime >= loadingMessages[currentIndex].time) {
          setUploadProgress(loadingMessages[currentIndex].threshold);
          setCurrentMessage(loadingMessages[currentIndex].message);
          currentIndex++;
        }
      }, 1000);


      await setupImage(imageUrl)

      clearInterval(progressInterval);
      setUploadProgress(100);
      setCurrentMessage("Complete!");

      setUploadProgress(100)
    } catch (error) {
      console.error("Error uploading image:", error)
    } finally {
      setIsLoading(false)
    }
  }

  //  layers
  const setupImage = async (imageUrl: string) => {

    console.log('Setup Image Start - canvasReady:', canvasReady);

    setCanvasReady(false);
    setIsLoading(true);
    setUploadProgress(0);


    try {

      if (!canvas && canvasRef.current) {
        const fabricCanvas = new Canvas(canvasRef.current);
        setCanvas(fabricCanvas);
      }


      // Load original image
      const img = await FabricImage.fromURL(imageUrl)
      console.log('Image loaded');

      const originalWidth = img.width!;
      const originalHeight = img.height!;


      const maxWidth = window.innerWidth * 0.9;  // 90% of viewport width
      const maxHeight = window.innerHeight * 0.8; // 80% of viewport height

      // Set canvas dimensions based on original image


      // Scale and set original as background
      const scale = Math.min(
        maxWidth / originalWidth,
        maxHeight / originalHeight,
        1 // Don't scale up images smaller than viewport
      );

      const finalWidth = originalWidth * scale;
      const finalHeight = originalHeight * scale;

      canvas?.setDimensions({
        width: finalWidth,
        height: finalHeight
      });

      img.scale(scale)
      if (canvas) {
        canvas.backgroundImage = img
        canvas.renderAll()
      }

      // Remove background and add as layer
      const imageBlob = await removeBackground(imageUrl);
      const removedBgUrl = URL.createObjectURL(imageBlob)
      const removedBgImage = await FabricImage.fromURL(removedBgUrl)
      setUploadProgress(100);

      // Use same scale as original
      removedBgImage.set({
        scaleX: scale,
        scaleY: scale,
        left: canvas?.width! / 2,
        top: canvas?.height! / 2,
        originX: 'center',
        originY: 'center',
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        perPixelTargetFind: true

      })


      canvas?.add(removedBgImage)
      setRemovedBgLayer(removedBgImage)

      canvas?.renderAll()
      setCanvasReady(true);
      console.log(canvasReady);

    } catch (error) {
      console.error("Error setting up image:", error)
      setCanvasReady(false);

    }
    finally {
      setIsLoading(false);
    }
  }

  // useEffect(() => {
  //   console.log('Canvas state:', {
  //     canvasExists: !!canvas,
  //     canvasReady,
  //     isLoading
  //   });
  // }, [canvas, canvasReady, isLoading]);




  function flipImage(direction: "horizontal" | "vertical") {
    if (!canvas) return

    const activeObject = canvas.getActiveObject()

    if (activeObject && activeObject.type === "image") {
      const image = activeObject as fabric.Image
      direction === "horizontal"
        ? image.set("flipX", !image.flipX)
        : image.set("flipY", !image.flipY)

      canvas.renderAll()
    }
  }

  function toggleFilter() {
    // Move to the next filter in the list
    const nextIndex = (currentFilterIndex + 1) % filterNames.length
    setCurrentFilterIndex(nextIndex)

    // Determine the next filter
    const nextFilter = filterNames[nextIndex]

    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "image") {
      const image = activeObject as FabricImage
      const filter = getFilter(nextFilter)

      image.filters = filter ? [filter] : []
      image.applyFilters()
        ; (image as any).filterName = nextFilter
      canvas.renderAll()
    }
  }

  function toggleDrawingMode() {
    setDrawingSettings((prev) => ({
      ...prev,
      isDrawing: !prev.isDrawing,
    }))
  }

  function incrementBrushSize() {
    setDrawingSettings((prev) => {
      let newSize = prev.brushSize + 2
      if (newSize > 20) {
        newSize = 2
      }
      return { ...prev, brushSize: newSize }
    })
  }

  function setBrushColor(color: string) {
    setDrawingSettings((prev) => ({
      ...prev,
      brushColor: color,
    }))
  }

  function deleteSelectedObject() {
    if (!canvas) return

    const activeObject = canvas.getActiveObject()

    if (activeObject) {
      canvas.remove(activeObject)
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }

  function downloadCanvas() {
    if (!canvas) return

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 3,
    })

    const link = document.createElement("a")
    link.href = dataURL
    link.download = "magictext.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }



  return {
    uploadProgress,
    currentMessage,
    isLoading,
    canvasRef,
    addText,
    changeFontFamily,
    changeTextColor,
    canvasReady,
    showStrokeUI,
    flipImage,
    addStroke,
    removeStroke,
    deleteSelectedObject,
    downloadCanvas,
    selectedTextProperties,
    toggleFilter,
    isImageSelected,
    toggleDrawingMode,
    incrementBrushSize,
    setBrushColor,
    strokeSettings,
    drawingSettings,
    handleImageUpload,
    isObjectSelected,
    updateStrokeColor,
    updateStrokeWidth
  }
}
