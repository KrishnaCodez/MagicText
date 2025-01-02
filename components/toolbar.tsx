"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Icons } from "./icons"
import { type Accept, useDropzone } from "react-dropzone"
import { Canvas } from "fabric"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
import { useWindow } from "@/hooks/use-window"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
// import { ScrollArea } from "./ui/scroll-area"
import { otherFonts, recommendedFonts } from "@/lib/constants"
import { CheckIcon, StarOff, Circle, ArrowUpFromLine, ArrowUpToLine, ArrowDownToLine } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ColorProps,
  DrawingPropertiesProps,
  GradientColors,
  selectedTextPropertiesProps,
  strokeSettingsProps,
  useFabric,
} from "@/hooks/use-fabric"
import { AnimatePresence, motion } from "framer-motion"
import { ColorPicker } from "./color-picker"
import { GradientStop } from '@/hooks/use-fabric';
import { isFabricGradient, isGradientColor } from "@/hooks/get-gradient"
import { set } from "zod"

// interface StrokeSettings {
//   color: string | GradientColor;
//   width: number;
//   enabled: boolean;
// }


export interface GradientColor {
  type: 'gradient';
  direction: 'horizontal' | 'vertical';
  stops: GradientStop[];
}



export type Color = string | GradientColor;

interface ToolbarProps {
  addText: () => void
  changeFontFamily: (fontFamily: string) => void
  changeTextColor: (color: ColorProps) => void;
  flipImage: (direction: "horizontal" | "vertical") => void
  deleteSelectedObject: () => void
  downloadCanvas: () => void
  selectedTextProperties: {
    fontColor: Color;
    fontFamily: string;
    isTextSelected: boolean;
  };
  strokeSettings: strokeSettingsProps
  toggleFilter: () => void
  isImageSelected: boolean
  toggleDrawingMode: () => void
  incrementBrushSize: () => void
  setBrushColor: (color: string) => void
  drawingSettings: DrawingPropertiesProps
  handleImageUpload: (file: File) => Promise<void>;  // Changed return type
  addStroke: () => void;
  updateStrokeWidth: () => void;
  updateStrokeColor: (color: ColorProps) => void;
  showStrokeUI: boolean;
  removeStroke: () => void;
  showDuplicateStroke: boolean;
  setShowDuplicateStroke: (show: boolean) => void;
}


const getBackgroundStyle = (color: string | GradientColor): string => {
  if (typeof color === 'object' && 'stops' in color) {
    const direction = color.direction === 'horizontal' ? 'to right' : 'to bottom';
    return `linear-gradient(${direction}, ${color.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(', ')
      })`;
  }
  return color;
};


export function Toolbar({
  addText,
  changeFontFamily,
  changeTextColor,
  flipImage,
  deleteSelectedObject,
  downloadCanvas,
  selectedTextProperties,
  toggleFilter,
  showDuplicateStroke,
  isImageSelected,
  toggleDrawingMode,
  incrementBrushSize,
  setBrushColor,
  drawingSettings,
  addStroke,
  updateStrokeWidth,
  updateStrokeColor,
  strokeSettings,
  showStrokeUI,
  removeStroke,
  setShowDuplicateStroke
}: ToolbarProps) {
  const {
    handleImageUpload,

  } = useFabric();

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        try {
          const file = acceptedFiles[0];
          await handleImageUpload(file);
        } catch (error) {
          console.error("Error uploading file:", error);
          alert("Failed to upload image. Please try again.");
        }
      }
    },
    [handleImageUpload]
  );


  const accept: Accept = {
    "image/*": [".jpg", ".jpeg", ".png"],
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  })

  const { isMobile } = useWindow()


  return (
    <div className="max-w-[100vw] px-5">
      <div className="no-scrollbar w-full overflow-x-auto rounded-xl border bg-white sm:overflow-visible">
        <div className="flex items-center space-x-2 p-2 px-3 text-2xl md:justify-center">

          <Button
            onClick={addText}
            variant="outline"
            size={"icon"}
            className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
          >
            <span className="tooltiptext">Text</span>
            <Icons.text className="size-4" />
          </Button>
          <AnimatePresence>
            {selectedTextProperties.isTextSelected && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.09 } }}
                transition={{
                  duration: 0.1,
                  stiffness: 900,
                  type: "spring",
                  damping: 50,
                }}
                className="flex items-center space-x-2"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size={"icon"}
                      className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                    >
                      <span className="tooltiptext">Font Family</span>
                      <Icons.font className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="max-w-[200px] w-full p-0 h-[250px] rounded-lg"
                  >
                    <Command>
                      <CommandInput placeholder="Search font family" />
                      <CommandList className="hide_scrollbar">
                        <CommandEmpty>No font family found.</CommandEmpty>
                        <CommandGroup heading="Recommended">
                          {/* <ScrollArea className="h-[250px] w-full"> */}
                          {recommendedFonts.map((fontName) => {
                            return (
                              <CommandItem
                                key={fontName}
                                value={fontName}
                                className={cn("cursor-pointer")}
                                onSelect={(currentValue) => {
                                  changeFontFamily(currentValue)
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: `'${fontName}', sans-serif`,
                                  }}
                                >
                                  {fontName}
                                </span>
                                <CheckIcon
                                  className={cn(
                                    "ml-auto size-4",
                                    fontName ===
                                      selectedTextProperties.fontFamily
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                        <CommandGroup heading="Others">
                          {/* <ScrollArea className="h-[250px] w-full"> */}
                          {otherFonts.map((fontName) => {
                            return (
                              <CommandItem
                                key={fontName}
                                value={fontName}
                                className={cn("cursor-pointer")}
                                onSelect={(currentValue) => {
                                  changeFontFamily(currentValue)
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: `'${fontName}', sans-serif`,
                                  }}
                                >
                                  {fontName}
                                </span>
                                <CheckIcon
                                  className={cn(
                                    "ml-auto size-4",
                                    fontName ===
                                      selectedTextProperties.fontFamily
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            )
                          })}
                          {/* </ScrollArea> */}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size={"icon"}
                      className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                      style={{
                        background: getBackgroundStyle(selectedTextProperties.fontColor),
                      }}

                    >
                      <span className="tooltiptext">Text Color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="mt-3 w-fit p-0 bg-transparent rounded-lg"
                    align="start"
                  >
                    <ColorPicker
                      color={selectedTextProperties.fontColor}
                      onChange={(color) => changeTextColor(color)}
                    />
                  </PopoverContent>


                </Popover>

                {selectedTextProperties.isTextSelected && showStrokeUI && <div className="h-5">
                  <div className="mx-1.5 h-full w-px bg-[#e5e5e5]"></div>
                </div>
                }


                <Button
                  onClick={selectedTextProperties.isTextSelected && showStrokeUI ? removeStroke : addStroke}
                  variant="outline"
                  size={"icon"}
                  className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                >
                  <span className="tooltiptext">{selectedTextProperties.isTextSelected && showStrokeUI ? "Remove Stroke" : "Stroke"}</span>
                  {selectedTextProperties.isTextSelected && showStrokeUI ? <Icons.removeStroke /> : <Icons.stroke />}                </Button>
                <AnimatePresence>
                  {selectedTextProperties.isTextSelected && showStrokeUI && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.09 } }}
                      transition={{
                        duration: 0.1,
                        stiffness: 900,
                        type: "spring",
                        damping: 50,
                      }}
                      className="flex items-center space-x-2">

                      <div>
                        <Button
                          variant="outline"
                          size={"icon"}
                          className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                          onClick={updateStrokeWidth}
                        >
                          <span className="tooltiptext">Stroke</span>
                          {strokeSettings.width}

                        </Button>
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size={"icon"}
                          className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                          onClick={() => {
                            setShowDuplicateStroke(!showDuplicateStroke);
                            console.log("Show Duplicate Stroke", showDuplicateStroke);
                          }}
                        >
                          {showDuplicateStroke ? < ArrowDownToLine className="size-4" /> : <ArrowUpToLine className="size-4" />}
                          <span className="tooltiptext">Stroke Upward</span>

                        </Button>
                      </div>



                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size={"icon"}
                            className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                            style={{
                              background: getBackgroundStyle(strokeSettings.color)
                            }}
                          >
                            <span className="tooltiptext">Stroke Color</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="mt-3 w-fit p-0 bg-transparent rounded-lg"
                          align="start"
                        >

                          <ColorPicker
                            color={selectedTextProperties.fontColor}
                            onChange={(color) => updateStrokeColor(color)}
                          />

                        </PopoverContent>
                      </Popover>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* //stroke */}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-5">
            <div className="mx-1.5 h-full w-px bg-[#e5e5e5]"></div>
          </div>
          <Button
            onClick={toggleDrawingMode}
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full hover:animate-jelly tooltip shrink-0 relative",
              drawingSettings.isDrawing &&
              "ring-2 ring-green-500 ring-offset-2",
            )}
          >
            <span className="tooltiptext">Draw</span>
            <Icons.draw className="size-4 " />
          </Button>
          <AnimatePresence>
            {drawingSettings.isDrawing && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.09 } }}
                transition={{
                  duration: 0.1,
                  stiffness: 900,
                  type: "spring",
                  damping: 50,
                }}
                className="flex items-center space-x-2"
              >
                <Button
                  onClick={incrementBrushSize}
                  variant="outline"
                  size="icon"
                  className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                >
                  <span className="tooltiptext">Brush Size</span>
                  {drawingSettings.brushSize}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size={"icon"}
                      className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
                      style={{ backgroundColor: drawingSettings.brushColor }}
                    >
                      <span className="tooltiptext">Brush Color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="mt-3 w-fit p-0 bg-transparent rounded-lg"
                    align="start"
                  >
                    <HexColorPicker
                      className="border-none"
                      color={drawingSettings.brushColor}
                      onChange={(color: string) => {
                        return setBrushColor(color)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-5">
            <div className="mx-1.5 h-full w-px bg-[#e5e5e5]"></div>
          </div>
          <Button
            onClick={deleteSelectedObject}
            variant="outline"
            size={"icon"}
            className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
          >
            <span className="tooltiptext">Delete</span>
            <Icons.trash className="size-4 text-red-600" />
          </Button>
          <div className="h-5">
            <div className="mx-1.5 h-full w-px bg-[#e5e5e5]"></div>
          </div>
          <Button
            onClick={downloadCanvas}
            variant="outline"
            size={"icon"}
            className="rounded-full hover:animate-jelly tooltip shrink-0 relative"
          >
            <span className="tooltiptext">Download</span>
            <Icons.download className="size-4" />
          </Button>
          {isMobile && (
            <div className="h-5 invisible">
              <div className="h-full w-px bg-[#e5e5e5]"></div>
            </div>
          )}
        </div>
      </div >
    </div >
  )
}
