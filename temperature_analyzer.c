/**
 * ============================================================================
 * COLLEGE C PROGRAMMING MICRO PROJECT
 * Title: SMART TEMPERATURE ANALYZER & CONVERTER WITH INTELLIGENT ALERTS
 * Student Name: Akshaya
 * Register No : URK26AI1052
 * Course      : C Programming & Problem Solving
 * Course Outcomes Covered: CO1, CO2, CO4, CO5
 * ============================================================================
 * 
 * MAIN CONCEPTS DEMONSTRATED:
 *  1. Conditional Statements (if, else if, else) - Temperature categorization & validation
 *  2. Switch Statements                         - Menu options & unit conversion selector
 *  3. Loops (do-while, while, for)              - Program menu cycle & history display
 *  4. User-Defined Functions                    - Modular calculation & report logic
 *  5. Structures                                - Data encapsulation of temperature records
 *  6. Pointers                                  - Pass-by-reference for memory efficiency
 *  7. Dynamic Memory Allocation (malloc, free)  - Dynamic history storage buffer
 *  8. File Handling (fopen, fprintf, fclose)    - Exporting persistent audit reports
 * ============================================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* Physical Constants - Absolute Zero Thresholds */
#define ABS_ZERO_CELSIUS    -273.15f
#define ABS_ZERO_FAHRENHEIT -459.67f
#define ABS_ZERO_KELVIN        0.00f

/* Temperature Category Enumeration */
typedef enum {
    CAT_FREEZING,
    CAT_COLD,
    CAT_NORMAL,
    CAT_WARM,
    CAT_HOT
} TempCategory;

/* Structure to store a single temperature reading (CO5: Structures) */
typedef struct {
    int id;
    float input_val;
    char input_unit;       /* 'C', 'F', or 'K' */
    float celsius;
    float fahrenheit;
    float kelvin;
    TempCategory category;
    char category_str[20];
    char alert_msg[100];
    char timestamp[30];
} TempRecord;

/* Structure to manage dynamic history buffer (CO5: Dynamic Memory & Structures) */
typedef struct {
    TempRecord *records;   /* Pointer to dynamically allocated array */
    int count;
    int capacity;
} TempHistory;

/* ============================================================================
 * FUNCTION DECLARATIONS (CO4: User-defined Functions)
 * ============================================================================
 */
void displayHeader(void);
void displayMenu(void);
int validateInput(float temp, char unit);
void performConversions(float input_temp, char unit, TempRecord *record);
void analyzeAndAlert(TempRecord *record);
void getFormattedTime(char *buffer, size_t max_len);
void initHistory(TempHistory *hist, int initial_capacity);
void addRecord(TempHistory *hist, const TempRecord *record);
void displayHistory(const TempHistory *hist);
void displayStatistics(const TempHistory *hist);
void exportReportToFile(const TempHistory *hist);
void freeHistory(TempHistory *hist);

/* ============================================================================
 * MAIN FUNCTION (CO2: Branching & Looping)
 * ============================================================================
 */
int main(void) {
    TempHistory history;
    initHistory(&history, 5);

    int choice = 0;
    char repeat = 'y';

    displayHeader();

    do {
        displayMenu();
        printf("Enter your choice (1-5): ");
        if (scanf("%d", &choice) != 1) {
            printf("\n[ERROR] Invalid input. Please enter a valid numerical choice.\n");
            while (getchar() != '\n'); /* Flush input buffer */
            continue;
        }

        /* CO2: Switch Statements */
        switch (choice) {
            case 1: { /* Celsius Input */
                float temp;
                printf("\nEnter temperature in Celsius (>= -273.15 C): ");
                if (scanf("%f", &temp) != 1) {
                    printf("\n[ERROR] Non-numeric input rejected!\n");
                    while (getchar() != '\n');
                    break;
                }

                if (!validateInput(temp, 'C')) {
                    printf("\n***************************************************\n");
                    printf(" [INVALID TEMPERATURE!]\n");
                    printf(" Temperature cannot be below absolute zero (-273.15 C).\n");
                    printf("***************************************************\n");
                    break;
                }

                TempRecord record;
                performConversions(temp, 'C', &record);
                analyzeAndAlert(&record);
                addRecord(&history, &record);
                break;
            }

            case 2: { /* Fahrenheit Input */
                float temp;
                printf("\nEnter temperature in Fahrenheit (>= -459.67 F): ");
                if (scanf("%f", &temp) != 1) {
                    printf("\n[ERROR] Non-numeric input rejected!\n");
                    while (getchar() != '\n');
                    break;
                }

                if (!validateInput(temp, 'F')) {
                    printf("\n***************************************************\n");
                    printf(" [INVALID TEMPERATURE!]\n");
                    printf(" Temperature cannot be below absolute zero (-459.67 F).\n");
                    printf("***************************************************\n");
                    break;
                }

                TempRecord record;
                performConversions(temp, 'F', &record);
                analyzeAndAlert(&record);
                addRecord(&history, &record);
                break;
            }

            case 3: { /* Kelvin Input */
                float temp;
                printf("\nEnter temperature in Kelvin (>= 0 K): ");
                if (scanf("%f", &temp) != 1) {
                    printf("\n[ERROR] Non-numeric input rejected!\n");
                    while (getchar() != '\n');
                    break;
                }

                if (!validateInput(temp, 'K')) {
                    printf("\n***************************************************\n");
                    printf(" [INVALID TEMPERATURE!]\n");
                    printf(" Temperature cannot be below absolute zero (0 K).\n");
                    printf("***************************************************\n");
                    break;
                }

                TempRecord record;
                performConversions(temp, 'K', &record);
                analyzeAndAlert(&record);
                addRecord(&history, &record);
                break;
            }

            case 4: { /* View History & Stats */
                displayHistory(&history);
                displayStatistics(&history);
                break;
            }

            case 5: { /* Export Audit Report to File (CO5: File Handling) */
                exportReportToFile(&history);
                break;
            }

            default:
                printf("\n[WARNING] Invalid selection! Please select between 1 and 5.\n");
                break;
        }

        printf("\nDo you wish to perform another operation? (y/n): ");
        scanf(" %c", &repeat);
        printf("\n");

    } while (repeat == 'y' || repeat == 'Y');

    printf("Exiting Smart Temperature Analyzer. Cleaning memory...\n");
    freeHistory(&history);
    printf("All dynamic resources safely released. Goodbye!\n");

    return 0;
}

/* ============================================================================
 * FUNCTION IMPLEMENTATIONS
 * ============================================================================
 */

void displayHeader(void) {
    printf("===================================================================\n");
    printf("        SMART TEMPERATURE ANALYZER & CONVERTER                     \n");
    printf("                 WITH INTELLIGENT ALERTS                           \n");
    printf("===================================================================\n");
    printf(" Subtitle   : Convert. Analyze. Monitor. Stay Informed.            \n");
    printf(" Developer  : Akshaya (URK26AI1052)                                \n");
    printf(" Technology : C Programming Micro Project                          \n");
    printf("===================================================================\n\n");
}

void displayMenu(void) {
    printf("------------------------ CONTROL MENU -----------------------------\n");
    printf(" 1. Convert & Analyze from Celsius    ( C)\n");
    printf(" 2. Convert & Analyze from Fahrenheit ( F)\n");
    printf(" 3. Convert & Analyze from Kelvin     ( K)\n");
    printf(" 4. View Recorded History & Analytics\n");
    printf(" 5. Export Analytical Report to File (temperature_report.txt)\n");
    printf("-------------------------------------------------------------------\n");
}

/**
 * CO1 & CO2: Validates whether input is physically possible (above absolute zero).
 * Returns 1 if valid, 0 if invalid.
 */
int validateInput(float temp, char unit) {
    if (unit == 'C' && temp < ABS_ZERO_CELSIUS) return 0;
    if (unit == 'F' && temp < ABS_ZERO_FAHRENHEIT) return 0;
    if (unit == 'K' && temp < ABS_ZERO_KELVIN) return 0;
    return 1;
}

/**
 * CO4 & CO5: Mathematical conversion logic using Pointers and Structures.
 */
void performConversions(float input_temp, char unit, TempRecord *record) {
    record->input_val = input_temp;
    record->input_unit = unit;
    getFormattedTime(record->timestamp, sizeof(record->timestamp));

    if (unit == 'C') {
        record->celsius = input_temp;
        record->fahrenheit = (input_temp * 9.0f / 5.0f) + 32.0f;
        record->kelvin = input_temp + 273.15f;
    } else if (unit == 'F') {
        record->celsius = (input_temp - 32.0f) * 5.0f / 9.0f;
        record->fahrenheit = input_temp;
        record->kelvin = record->celsius + 273.15f;
    } else if (unit == 'K') {
        record->celsius = input_temp - 273.15f;
        record->fahrenheit = (record->celsius * 9.0f / 5.0f) + 32.0f;
        record->kelvin = input_temp;
    }
}

/**
 * CO1 & CO2: Temperature condition analysis and intelligent alert generation.
 */
void analyzeAndAlert(TempRecord *record) {
    float c = record->celsius;

    /* Categorization logic based on project specifications */
    if (c <= 0.0f) {
        record->category = CAT_FREEZING;
        strcpy(record->category_str, "Freezing");
        strcpy(record->alert_msg, "[ALERT - BLUE] Very cold temperature detected. Freeze warning!");
    } else if (c > 0.0f && c <= 15.0f) {
        record->category = CAT_COLD;
        strcpy(record->category_str, "Cold");
        strcpy(record->alert_msg, "[ALERT - CYAN] Low temperature detected. Chilly weather.");
    } else if (c > 15.0f && c <= 25.0f) {
        record->category = CAT_NORMAL;
        strcpy(record->category_str, "Normal");
        strcpy(record->alert_msg, "[ALERT - MILD] Temperature is in the normal project-defined range.");
    } else if (c > 25.0f && c <= 35.0f) {
        record->category = CAT_WARM;
        strcpy(record->category_str, "Warm");
        strcpy(record->alert_msg, "[ALERT - AMBER] Warm temperature detected. Stay hydrated.");
    } else {
        record->category = CAT_HOT;
        strcpy(record->category_str, "Hot");
        strcpy(record->alert_msg, "[ALERT - RED] High temperature detected. Heat caution advisory!");
    }

    /* Print immediate dashboard feedback */
    printf("\n================ CONVERSION & ANALYSIS RESULTS ================\n");
    printf(" Input Entered        : %.2f %c\n", record->input_val, record->input_unit);
    printf(" Converted Celsius    : %.2f C\n", record->celsius);
    printf(" Converted Fahrenheit : %.2f F\n", record->fahrenheit);
    printf(" Converted Kelvin     : %.2f K\n", record->kelvin);
    printf(" Analyzed Category    : %s\n", record->category_str);
    printf(" Intelligent Alert    : %s\n", record->alert_msg);
    printf(" Timestamp Recorded   : %s\n", record->timestamp);
    printf("===============================================================\n");
}

/**
 * Retrieves human-readable timestamp.
 */
void getFormattedTime(char *buffer, size_t max_len) {
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    if (t != NULL) {
        strftime(buffer, max_len, "%Y-%m-%d %H:%M:%S", t);
    } else {
        strncpy(buffer, "N/A", max_len);
    }
}

/**
 * CO5: Dynamic Memory Allocation - Initializes memory buffer.
 */
void initHistory(TempHistory *hist, int initial_capacity) {
    hist->records = (TempRecord *)malloc(initial_capacity * sizeof(TempRecord));
    if (hist->records == NULL) {
        printf("[FATAL] Memory allocation failed during initialization!\n");
        exit(EXIT_FAILURE);
    }
    hist->count = 0;
    hist->capacity = initial_capacity;
}

/**
 * CO5: Dynamic reallocation of records when capacity is reached.
 */
void addRecord(TempHistory *hist, const TempRecord *record) {
    if (hist->count >= hist->capacity) {
        hist->capacity *= 2;
        TempRecord *temp = (TempRecord *)realloc(hist->records, hist->capacity * sizeof(TempRecord));
        if (temp == NULL) {
            printf("[WARNING] Failed to expand history buffer. Record not logged.\n");
            return;
        }
        hist->records = temp;
    }
    hist->records[hist->count] = *record;
    hist->records[hist->count].id = hist->count + 1;
    hist->count++;
    printf("[SYSTEM] Record #%d successfully logged in dynamic memory.\n", hist->count);
}

/**
 * Displays latest 5 readings or complete history.
 */
void displayHistory(const TempHistory *hist) {
    printf("\n=================== RECORDED TEMPERATURE HISTORY ===================\n");
    if (hist->count == 0) {
        printf(" No temperature records found. Please perform a conversion first.\n");
        printf("====================================================================\n");
        return;
    }

    int start = (hist->count > 5) ? (hist->count - 5) : 0;
    printf("Displaying latest %d of %d total reading(s):\n", hist->count - start, hist->count);
    printf("%-4s | %-12s | %-9s | %-9s | %-9s | %-10s\n", 
           "ID", "Input", "Celsius", "Fahr", "Kelvin", "Category");
    printf("--------------------------------------------------------------------\n");

    for (int i = start; i < hist->count; i++) {
        TempRecord r = hist->records[i];
        printf("#%-3d | %6.2f %-4c | %6.2f C | %6.2f F | %6.2f K | %-10s\n",
               r.id, r.input_val, r.input_unit, r.celsius, r.fahrenheit, r.kelvin, r.category_str);
    }
    printf("====================================================================\n");
}

/**
 * Calculates statistical metrics across all valid readings.
 */
void displayStatistics(const TempHistory *hist) {
    if (hist->count == 0) return;

    float min_c = hist->records[0].celsius;
    float max_c = hist->records[0].celsius;
    float sum_c = 0.0f;
    int cat_counts[5] = {0};

    for (int i = 0; i < hist->count; i++) {
        float c = hist->records[i].celsius;
        if (c < min_c) min_c = c;
        if (c > max_c) max_c = c;
        sum_c += c;
        cat_counts[hist->records[i].category]++;
    }

    float avg_c = sum_c / (float)hist->count;

    printf("\n==================== TEMPERATURE ANALYTICAL STATS ==================\n");
    printf(" Total Valid Readings Recorded : %d\n", hist->count);
    printf(" Highest Recorded Temperature  : %.2f C (%.2f F / %.2f K)\n", 
           max_c, (max_c * 9.0f / 5.0f) + 32.0f, max_c + 273.15f);
    printf(" Lowest Recorded Temperature   : %.2f C (%.2f F / %.2f K)\n", 
           min_c, (min_c * 9.0f / 5.0f) + 32.0f, min_c + 273.15f);
    printf(" Mean / Average Temperature    : %.2f C\n", avg_c);
    printf(" Category Distribution         : Freezing: %d | Cold: %d | Normal: %d | Warm: %d | Hot: %d\n",
           cat_counts[0], cat_counts[1], cat_counts[2], cat_counts[3], cat_counts[4]);
    printf("====================================================================\n");
}

/**
 * CO5: File Handling - Exports a structured formatted report to disk.
 */
void exportReportToFile(const TempHistory *hist) {
    if (hist->count == 0) {
        printf("\n[ERROR] Cannot export report: No temperature records available!\n");
        return;
    }

    FILE *fp = fopen("temperature_report.txt", "w");
    if (fp == NULL) {
        printf("\n[ERROR] Unable to create file for export.\n");
        return;
    }

    char time_str[30];
    getFormattedTime(time_str, sizeof(time_str));

    fprintf(fp, "===============================================================================\n");
    fprintf(fp, "           SMART TEMPERATURE ANALYZER & CONVERTER - AUDIT REPORT              \n");
    fprintf(fp, "===============================================================================\n");
    fprintf(fp, "Generated On : %s\n", time_str);
    fprintf(fp, "Student Name : Akshaya | Register Number: URK26AI1052\n");
    fprintf(fp, "Project Type : College C Programming Micro Project\n");
    fprintf(fp, "Total Logs   : %d Records\n", hist->count);
    fprintf(fp, "===============================================================================\n\n");

    fprintf(fp, "%-4s | %-20s | %-12s | %-10s | %-10s | %-10s | %-10s\n",
            "ID", "Timestamp", "Input Value", "Celsius", "Fahrenheit", "Kelvin", "Category");
    fprintf(fp, "-------------------------------------------------------------------------------\n");

    float sum_c = 0.0f, min_c = hist->records[0].celsius, max_c = hist->records[0].celsius;
    int cat_distribution[5] = {0};

    for (int i = 0; i < hist->count; i++) {
        TempRecord r = hist->records[i];
        fprintf(fp, "#%-3d | %-20s | %6.2f %-4c | %7.2f C | %7.2f F | %7.2f K | %-10s\n",
                r.id, r.timestamp, r.input_val, r.input_unit, r.celsius, r.fahrenheit, r.kelvin, r.category_str);

        if (r.celsius < min_c) min_c = r.celsius;
        if (r.celsius > max_c) max_c = r.celsius;
        sum_c += r.celsius;
        cat_distribution[r.category]++;
    }

    fprintf(fp, "-------------------------------------------------------------------------------\n\n");
    fprintf(fp, "SUMMARY ANALYTICAL STATISTICS:\n");
    fprintf(fp, "- Average Temperature: %.2f C\n", sum_c / (float)hist->count);
    fprintf(fp, "- Maximum Temperature: %.2f C\n", max_c);
    fprintf(fp, "- Minimum Temperature: %.2f C\n", min_c);
    fprintf(fp, "- Distribution: Freezing=%d, Cold=%d, Normal=%d, Warm=%d, Hot=%d\n",
            cat_distribution[0], cat_distribution[1], cat_distribution[2], cat_distribution[3], cat_distribution[4]);
    fprintf(fp, "\n================================ END OF REPORT ================================\n");

    fclose(fp);
    printf("\n[SUCCESS] Report exported successfully to file 'temperature_report.txt'!\n");
}

/**
 * CO5: Dynamic Memory Allocation - Safely releases allocated heap memory.
 */
void freeHistory(TempHistory *hist) {
    if (hist->records != NULL) {
        free(hist->records);
        hist->records = NULL;
    }
    hist->count = 0;
    hist->capacity = 0;
}

