"use client";

import React from "react";
import { Container, Box } from "@mui/material";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

interface SalaryData {
  company_name?: string;
  company?: string;
  designation?: string;
  role?: string;
  location: string;
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  salaryData: SalaryData;
}

export default function SidebarLayout({ children, salaryData }: SidebarLayoutProps) {
  return (
    <Container maxWidth={false} className="px-2 sm:px-4 py-4 sm:py-8">
      {/* Mobile & Tablet: Stack vertically */}
      <div className="flex flex-col lg:hidden gap-4">
        {/* Main Content */}
        <Box className="w-full">
          {children}
        </Box>

        {/* Left Sidebar - Below main content on mobile/tablet */}
        <Box className="w-full">
          <LeftSidebar salaryData={salaryData} />
        </Box>

        {/* Right Sidebar - Below left sidebar on mobile/tablet */}
        <Box className="w-full">
          <RightSidebar salaryData={salaryData} />
        </Box>
      </div>

      {/* Desktop: Side by side layout */}
      <Box className="hidden lg:flex gap-6">
        {/* Left Sidebar */}
        <Box className="lg:w-64 xl:w-72 flex-shrink-0">
          <div className="sticky top-8">
            <LeftSidebar salaryData={salaryData} />
          </div>
        </Box>

        {/* Main Content */}
        <Box className="flex-1 min-w-0">
          {children}
        </Box>

        {/* Right Sidebar */}
        <Box className="lg:w-64 xl:w-72 flex-shrink-0">
          <div className="sticky top-8">
            <RightSidebar salaryData={salaryData} />
          </div>
        </Box>
      </Box>
    </Container>
  );
}

