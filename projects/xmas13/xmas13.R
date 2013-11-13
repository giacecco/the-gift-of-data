library(data.table) 
library(utils)

# download the file from the World Bank website (zipped)
download.file("http://api.worldbank.org/v2/en/indicator/si.pov.dday?downloadformat=csv", "./si.pov.dday.csv.zip")

# unzip only the file containing the actual survey data...
unzip("./si.pov.dday.csv.zip", c("si.pov.dday_Indicator_en_csv_v2.csv"), overwrite = T)

# ... and read it, after skippig the comments in the first two lines
csvFile <- readLines("si.pov.dday_Indicator_en_csv_v2.csv")[-1:-2]
indicators <- data.table(read.csv(textConnection(csvFile), header = T, stringsAsFactors = F))

# remove the unused columns
indicators <- Reduce(function (memo, columnName) { memo[, !columnName , with = F]}, c("Country.Code", "Indicator.Name", "Indicator.Code", "X"), indicators)

# add a 'latestSurvey' column with the latest survey figure for each country, if available
indicators$latestSurvey <- apply(indicators[, -1, with = F], 1, function(x) { 
    nonNaElements <- x[!is.na(x)]
    if (length(nonNaElements) > 0) tail(nonNaElements, 1) else NA
})

# remove the columns with each year's survey data
indicators <- Reduce(function (memo, year) { memo[, !paste0('X', toString(year)) , with = F]}, 1961:2013, indicators)

# remove the rows that have no survey data
indicators <- indicators[!is.na(latestSurvey), ]

# convert the survey data to numeric and re-order from the poorest country to the richest
indicators$latestSurvey <- as.numeric(indicators$latestSurvey)
indicators <- indicators[order(-latestSurvey), ]

write.csv(indicators, "./xmas13.csv", row.names = FALSE)