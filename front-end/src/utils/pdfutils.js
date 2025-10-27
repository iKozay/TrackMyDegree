/* eslint-disable prettier/prettier */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
export const exportTimelineToPDF = async () => {
    const input = document.querySelector('.timeline-middle-section');
    const scrollWrapper = document.querySelector('.timeline-scroll-wrapper');
    const addSemesterButton = document.querySelector('.add-semester-button');


    if (!input || !scrollWrapper) {
        alert('Timeline section not found');
        return;
    }
    const deleteButtons = input.querySelectorAll('.remove-semester-btn, .remove-course-btn');

    // Backup original styles
    const originalHeight = input.style.height;
    const originalOverflow = input.style.overflow;
    const originalScrollHeight = scrollWrapper.style.height;
    const originalWrapperOverflow = scrollWrapper.style.overflow;
    const originalButtonDisplay = addSemesterButton?.style.display;

    // Hide the add semester button
    if (addSemesterButton) {
        addSemesterButton.style.display = 'none';
    }

    // Hide delete buttons in semesters
    deleteButtons.forEach((btn) => {
        btn.style.display = 'none';
    });

    // Temporarily force full height for PDF capture
    const originalScrollLeft = scrollWrapper.scrollLeft;
    const originalScrollTop = scrollWrapper.scrollTop;

    input.style.height = 'auto';
    input.style.overflow = 'visible';
    scrollWrapper.style.height = 'auto';
    scrollWrapper.style.overflow = 'visible';

    // Expand the wrapper to full scrollable width & height
    const fullWidth = scrollWrapper.scrollWidth;
    const fullHeight = scrollWrapper.scrollHeight;

    html2canvas(scrollWrapper, {
        scale: 2,
        useCORS: true,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
    })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = canvas.width;
            const pdfHeight = canvas.height;

            const pdf = new jsPDF('l', 'px', [pdfWidth, pdfHeight]);
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('timeline.pdf');
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF.');
        })
        .finally(() => {
            // Restore original styles
            input.style.height = originalHeight;
            input.style.overflow = originalOverflow;
            scrollWrapper.style.height = originalScrollHeight;
            scrollWrapper.style.overflow = originalWrapperOverflow;
            scrollWrapper.scrollLeft = originalScrollLeft;
            scrollWrapper.scrollTop = originalScrollTop;

            if (addSemesterButton) addSemesterButton.style.display = originalButtonDisplay;
            deleteButtons.forEach(btn => (btn.style.display = ''));
        });
}