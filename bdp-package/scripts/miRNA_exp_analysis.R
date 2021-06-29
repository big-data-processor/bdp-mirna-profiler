library('DESeq2')
library("pheatmap")
library("RColorBrewer")
library('ggplot2')
#source("https://bioconductor.org/biocLite.R")
library("goseq")
library("genefilter")
library(openxlsx)
library(GenomicFeatures)

sessionInfo();
args <- commandArgs(trailingOnly = TRUE);

inputTCGAfolder <- args[1];
projectInfo <- args[2];
targetScanRefPath <- args[3];
keggPathwayFile <- args[4];
theGTFFile <- args[5];
biomaRTablePath <- args[6]
cutoff <- as.numeric(args[7]);
outputFolder <- args[8];
dir.create(file.path(outputFolder));
#inputTCGAfolder = "E:\\bioDataProcessor\\bdp server\\datasets\\5b74f784419de34878f17b34\\5b83c264aeab123ca0cdc290";
#projectInfo = "E:\\miRNA_sorting\\data\\The project info.xlsx";
#targetScanRefPath = "E:\\miRNA_sorting\\data\\Mouse_Conserved_Site_Context_Scores.txt";
#keggPathwayFile = "E:\\miRNA_sorting\\data\\kegg_pathway_mmu.txt";
#theGTFFile = "E:\\miRNA_sorting\\data\\gencode.vM12.chr_patch_hapl_scaff.annotation.gtf";
#mart ='ENSEMBL_MART_ENSEMBL';
#dataset = 'mmusculus_gene_ensembl';  # mmurinus_gene_ensembl | 
#host = 'www.ensembl.org';
#outputFolder = "E:\\miRNA_sorting\\results\\analysis_output";\

options(bitmapType='cairo');
inputDataPath = paste(inputTCGAfolder, '/expn_matrix_mimat_idTransformed.txt', sep='');
#inputDataPath = "E:\\bioDataProcessor\\server\\datasets\\59afb6c6e88f276ad4c0f41c\\59c1b2e22ca8d66a10e0e3b5\\59c1fd452ca8d66a10e0e41f\\expn_matrix_mimat_idTransformed.txt"
#targetScanRefPath = "E:\\miRNA_sorting\\data\\Predicted_Targets_Context_Scores.default_predictions.txt";

#projectInfo = "E:\\miRNA_sorting\\data\\The\ project\ info.xlsx";
#keggPathwayFile = "E:\\miRNA_sorting\\data\\kegg_pathway_mmu.txt"
#outputFolder = "E:\\]miRNA_sorting\\results";


#Outputs (across all samples)
hierarchicalClusterSVG = paste(outputFolder, '/', "hierarchical_clustering.svg", sep="");
hierarchicalClusterPNG = paste(outputFolder, '/', "hierarchical_clustering.png", sep="");

PCAplotSVG = paste(outputFolder, '/', "pca_plot.svg", sep="");  
PCAplotPNG = paste(outputFolder, '/', "pca_plot.png", sep="");

topDiffClusterSVG = paste(outputFolder, '/', "top_diff_2d_cluster.svg", sep="");
topDiffClusterPNG = paste(outputFolder, '/', "top_diff_2d_cluster.png", sep="");



normalizedReadCountOutput = paste(outputFolder, '/', "normalized_readcounts.csv", sep="");
rlogNormalizedReadCountOutput = paste(outputFolder, '/', "rlog_normalized_readcounts.csv", sep="");

KEGGpathToDesc <- read.delim(keggPathwayFile, header=F,sep="\t",colClasses = c("factor","factor"));
KEGGpathToDesc[,1] = sub('path:...', '', KEGGpathToDesc[,1]);
colnames(KEGGpathToDesc)<-c("pathway_id","description");




data = read.table(inputDataPath, header=TRUE, sep="\t", quote="", stringsAsFactors=F);
dataMatrix = data[2:dim(data)[1],2:dim(data)[2]]
dataMatrix = apply(dataMatrix, 2, as.numeric);
rownames(dataMatrix) = data[2:dim(data)[1], 1]
colnames(dataMatrix) = colnames(data)[2:dim(data)[2]]

#colData = read.table(colDataPath, header=TRUE, sep=',', quote="", stringsAsFactors=TRUE);

colData = read.xlsx(projectInfo, sheet='Sample info');
colDataMatrix = colData[,2:dim(colData)[2]]
rownames(colDataMatrix) = make.names(colData[, 1]);
# Important!! Needs to reorder the colData's rownames
colDataMatrix = colDataMatrix[colnames(dataMatrix), ];


projectParameters = read.xlsx(projectInfo, sheet ='Case info', colNames=F, rowNames=F)
foldChangePosCutOff = as.numeric(projectParameters[7, 2]);
foldChangeNegCutOff = as.numeric(projectParameters[8, 2]);
pvalueCut = as.numeric(projectParameters[9, 2]);

targetScanRef = read.table(targetScanRefPath, header=T, sep='\t', quote='', stringsAsFactors=F);
targetScanRef = targetScanRef[which(targetScanRef[, 12] > 95),];
allTargets = unique(targetScanRef[, 1]);
allTargets = sub('\\.\\d+', '', allTargets);

colDataMatrix$batch = as.factor(colDataMatrix$batch);

if (length(levels(colDataMatrix$batch)) > 1) {
  #all(rownames(colDataMatrix) %in% colnames(dataMatrix))
  #should be true
  dds <- DESeqDataSetFromMatrix(countData = dataMatrix,
                              colData = colDataMatrix,
                              design = ~ condition + batch);
}else {
  colDataMatrix = colDataMatrix[, c('condition', 'type')];
  dds <- DESeqDataSetFromMatrix(countData = dataMatrix,
                              colData = colDataMatrix,
                              design = ~ condition);
}

print(dds);
global_read_counts = as.numeric(counts(dds));

if (isTRUE(cutoff == -1)) {
  # global mean
  write("You are using a global mean as a cutoff to filter out low abundance miRNA species.\n", stdout())
  cut = mean(global_read_counts);
}else if (isTRUE(cutoff > 0) & isTRUE(cutoff < 1)) {
  # Quantile
  write(paste0("You are using a ", cutoff , " quantile as a cutoff to filter out low abundance miRNA species.\n"), stdout())
  cut = as.numeric(quantile(global_read_counts, cutoff)[1])
}else if (isTRUE(cutoff >= 1)) {
  # absolute read counts
  write(paste0("You use a read count cutoff, " , cutoff, ", to filter out low abundance miRNA species.\n"), stdout())
  cut = cutoff;
}else {
  write(paste0("No pre-filtering was processed. Using the full data matrix."), stdout())
  cut = 0;
}

write(paste0("The resulting read count cutoff: ", cut, "\n"), stdout());
#Usually, we do not pre-filter miRNA species as described in https://bioconductor.org/packages/release/bioc/vignettes/DESeq2/inst/doc/DESeq2.html#pre-filtering.
# MiRNA species were removed only when the expression of low abundance across all samples.
# At least one sameple meets the criteria, we preserve the miRNA species.
dds <- dds[rowSums(counts(dds) >= cut) >=1, ];
des <- DESeq(dds);
normalizedCounts = counts(des, normalized=T);
write.table(normalizedCounts, normalizedReadCountOutput, quote=FALSE, sep=",");


#heatmap
#Dut to no replicates we use blind=true instead. SHOULD use blind=FALSE when there are replicates
rld = tryCatch({
  cat('rlog normalization with option blind = FALSE\n');
  rlog(dds, blind=FALSE)
}, error = function(err) { 
    cat('rlog normalization with option blind = TRUE\n');
    rld = rlog(dds, blind=TRUE);
    return(rld);
});
rlogNormalizedCounts = assay(rld);
write.table(rlogNormalizedCounts, rlogNormalizedReadCountOutput, quote=FALSE, sep=",");

sampleDists <- dist(t(rlogNormalizedCounts))
sampleDistMatrix <- as.matrix( sampleDists )
rownames(sampleDistMatrix) <- rld$condition
colnames(sampleDistMatrix) <- colnames(rld)
colors <- colorRampPalette( rev(brewer.pal(9, "Blues")) )(255)

svg(hierarchicalClusterSVG, width=12, height=8,onefile=FALSE);
pheatmap(sampleDistMatrix,
         clustering_distance_rows=sampleDists,
         clustering_distance_cols=sampleDists,
         col=colors)
dev.off()
png(hierarchicalClusterPNG, width=1024, height= 768);
pheatmap(sampleDistMatrix,
         clustering_distance_rows=sampleDists,
         clustering_distance_cols=sampleDists,
         col=colors)
dev.off()

##PCA plot
pcaData <- plotPCA(rld, intgroup=c("condition", "type"), returnData=TRUE)
percentVar <- round(100 * attr(pcaData, "percentVar"))

svg(PCAplotSVG, width=12, height=8, onefile=FALSE);
ggplot(pcaData, aes(PC1, PC2, color=condition, shape=type)) +
  geom_point(size=3) +
  xlab(paste0("PC1: ",percentVar[1],"% variance")) +
  ylab(paste0("PC2: ",percentVar[2],"% variance")) + 
  coord_fixed()
dev.off();

png(PCAplotPNG, width=1024, height=768);
ggplot(pcaData, aes(PC1, PC2, color=condition, shape=type)) +
  geom_point(size=3) +
  xlab(paste0("PC1: ",percentVar[1],"% variance")) +
  ylab(paste0("PC2: ",percentVar[2],"% variance")) + 
  coord_fixed()
dev.off();

#Due to no replcates the blind can not be set to FALSE, we just report the normalized counts

topVarGenes <- head(order(rowVars(assay(rld)), decreasing = TRUE), 100)
mat  <- assay(rld)[ topVarGenes, ]
mat  <- mat - rowMeans(mat)
anno <- as.data.frame(colData(rld)[, "condition"])
rownames(anno)<- colnames(mat)
colnames(anno)<-"Condition";
svg(topDiffClusterSVG, width=12, height= 10, onefile=FALSE);
  pheatmap(mat, annotation_col = anno, fontsize=8)
dev.off();
png(topDiffClusterPNG, width=1536, height=1152);
  pheatmap(mat, annotation_col = anno, fontsize=8)
dev.off();


#Preparing reference data for 

txdb = makeTxDbFromGFF(theGTFFile, format='gtf');
txsByGene=transcriptsBy(txdb,"gene")
lengthData=median(width(txsByGene));
names(lengthData) = sub('\\.\\d+', '', names(lengthData));


## Remove allTargets that do not exist in lengthData
allTargets = allTargets[which(allTargets %in% names(lengthData))];

GOMap = read.table(biomaRTablePath, sep="\t", quote="", header=TRUE)
# The biomartTable expects columes: c("ensembl_gene_id","go_id", "go_linkage_type", "entrezgene", "namespace_1003", "name_1006","kegg_enzyme","transcript_length")
colnames(GOMap) = c("ensembl_gene_id","go_id", "go_linkage_type", "entrezgene", "namespace_1003", "name_1006","kegg_enzyme","transcript_length");
KEGGMap = GOMap[which(GOMap[, 'kegg_enzyme'] != ''), c('ensembl_gene_id', 'kegg_enzyme')];
KEGGMap[,2] = sub('\\+.*', '', KEGGMap[, 2]);

#Start finding DE miRNAs
contrasts = read.xlsx(projectInfo, sheet='Contrasts', rowNames=FALSE, colNames=FALSE);
for (i in 1:dim(contrasts)[1]) {
  #contrast = c("condition", levels(unique(colData[, 'condition'])))
  contrast = c("condition", contrasts[i, 1], contrasts[i, 2]);
  contrastName = paste(contrasts[i, 1], '_vs_', contrasts[i, 2], sep='');
  outputDEPositivePath = paste(outputFolder, '/', contrastName, "_deList_positive.csv", sep='');
  outputDENegativePath = paste(outputFolder, '/', contrastName, "_deList_negative.csv", sep='');
  predictedPositiveTargetFile = paste(outputFolder, '/', contrastName, "_predictedTargets_pos.csv", sep="");
  predictedNegativeTargetFile = paste(outputFolder, '/', contrastName, "_predictedTargets_neg.csv", sep="");
  posGOEnrichFile = paste(outputFolder, '/', contrastName, "_go_predictedTargets_pos.txt", sep="");
  posKEGGEnrichFile = paste(outputFolder, '/', contrastName, "_kegg_predictedTargets_pos.txt", sep="");
  negGOEnrichFile = paste(outputFolder, '/', contrastName, "_go_predictedTargets_neg.txt", sep="");
  negKEGGEnrichFile = paste(outputFolder, '/', contrastName, "_kegg_predictedTargets_neg.txt", sep="");
  volcanoPlotPNG = paste(outputFolder, '/', contrastName, "_volcano_plot.png", sep="");
  volcanoPlotPDF = paste(outputFolder, '/', contrastName, "_volcano_plot.pdf", sep="");
  volcanoPlotSVG = paste(outputFolder, '/', contrastName, "_volcano_plot.svg", sep="");
  barPlotPNG = paste(outputFolder, '/', contrastName, "_barplot.png", sep="");
  barPlotPDF = paste(outputFolder, '/', contrastName, "_barplot.pdf", sep="");
  barPlotSVG = paste(outputFolder, '/', contrastName, "_barplot.svg", sep="");

  res <- results(des, contrast=contrast);
  filteredRes = res[which(!is.na(res$log2FoldChange)),]

  #Volcano plot
  volcanoPlotData = data.frame(filteredRes[which(!is.na(filteredRes$padj)),])
  minY = min(volcanoPlotData$padj);
  volcanoPlot = ggplot(volcanoPlotData,aes(x=log2FoldChange,y=-1*log10(padj))) +
  geom_point(alpha=0.5) +
  scale_y_log10() +
  geom_hline(yintercept = -1*log10(pvalueCut)) +
  geom_vline(xintercept = c(foldChangeNegCutOff,foldChangePosCutOff)) +
  xlim(c(-12,12)) +
  geom_text(x = foldChangeNegCutOff, y = -Inf, vjust=-1.01, hjust=1.1, label = paste(foldChangeNegCutOff)) +
  geom_text(x = foldChangePosCutOff, y = -Inf, vjust=-1.01, hjust=-0.1, label = paste(foldChangePosCutOff)) +
  geom_text(x = -Inf, y = (-1 * log10(pvalueCut)), vjust=0, hjust=-0.1, label = paste('p-value =', pvalueCut, '(', (-1 * log10(pvalueCut)), ')')) +
  theme_bw()
  

  pdf(volcanoPlotPDF, width=12, height=8, onefile=FALSE);
    plot(volcanoPlot);
  dev.off();

  png(volcanoPlotPNG, width=1536, height=1152);
    plot(volcanoPlot);
  dev.off();

  svg(volcanoPlotSVG, width=12, height=8, onefile=FALSE);
    plot(volcanoPlot);
  dev.off();

  positiveRes = filteredRes[which(filteredRes$log2FoldChange > foldChangePosCutOff & filteredRes$padj < pvalueCut),];
  positiveRes = positiveRes[order(positiveRes$log2FoldChange, decreasing=TRUE), ];
  #positiveRes = positiveRes[1:40, ]
  write.table(positiveRes, outputDEPositivePath, quote=FALSE, sep=",")

  negativeRes = filteredRes[which(filteredRes$log2FoldChange < foldChangeNegCutOff & filteredRes$padj < pvalueCut),];
  negativeRes = negativeRes[order(negativeRes$log2FoldChange, decreasing=FALSE), ];
  #negativeRes = negativeRes[1:40, ]
  write.table(negativeRes, outputDENegativePath, quote=FALSE, sep=",")

  
  
  posLength = dim(positiveRes)[1];
  negLength = dim(negativeRes)[1];
  if (posLength < 20) {
    positiveResA = filteredRes[which(filteredRes$log2FoldChange > foldChangePosCutOff), ];
    positiveResA = positiveResA[order(positiveResA$log2FoldChange, decreasing=TRUE), ];
  } else {
    positiveResA = positiveRes;
  }
  if (negLength < 20) {
    negativeResA = filteredRes[which(filteredRes$log2FoldChange < foldChangeNegCutOff), ];
    negativeResA = negativeResA[order(negativeResA$log2FoldChange, decreasing=FALSE), ];
  } else {
    negativeResA = negativeRes;
  }
  posLengthA = dim(positiveResA)[1];
  negLengthA = dim(negativeResA)[1];
  if (posLengthA < 20) {
    positiveResB = filteredRes[which(filteredRes$log2FoldChange > 0), ];
    positiveResB = positiveResB[order(positiveResB$log2FoldChange, decreasing=TRUE), ];
  } else {
    positiveResB = positiveResA;
  }
  if (posLengthA < 20) {
    negativeResB = filteredRes[which(filteredRes$log2FoldChange < 0), ];
    negativeResB = negativeResB[order(negativeResB$log2FoldChange, decreasing=TRUE), ];
  } else {
    negativeResB = negativeResA;
  }
  posLengthB = dim(positiveResB)[1];
  negLengthB = dim(negativeResB)[1];
  if (posLengthB > 20) { posLengthB = 20; }
  if (negLengthB > 20) { negLengthB = 20; }
  if (posLengthB > 0 & negLengthB > 0) {
    totalDEres = rbind(positiveResB[1:posLengthB, ], negativeResB[1:negLengthB, ]);
  } else if (posLengthB == 0 && negLengthB > 0) {
    totalDEres = negativeResB[1:negLengthB, ];
  } else if (posLengthB > 0 && negLengthB == 0) {
    totalDEres = positiveResB[1:posLengthB, ];
  } else {
    totalDEres = NA;
  }
  if (!is.na(totalDEres)) { 
    barPlotData = data.frame(rownames(totalDEres), totalDEres[, 2], totalDEres$padj);
    colnames(barPlotData) = c('miRNAs', 'log2FoldChange', 'padj');
    print(barPlotData);
    barPlot <- ggplot(barPlotData, aes(x=reorder(miRNAs, log2FoldChange), y=log2FoldChange, fill=ifelse(padj < pvalueCut, ifelse(log2FoldChange > 0, "darkred", "darkgreen"), ifelse(log2FoldChange > 0, "#ffcccc", "#b5fcb5")))) +
      geom_bar(stat = "identity") +
      scale_fill_identity(guide = FALSE) + 
      theme_bw() + 
      theme(axis.text.x = element_text(angle = 90, vjust=0.2, hjust=0.95));

    png(barPlotPNG, width=1536, height=1152);
      plot(barPlot);
    dev.off();

    pdf(barPlotPDF, width=12, height=8, onefile=FALSE);
      plot(barPlot);
    dev.off();

    svg(barPlotSVG, width=12, height=8, onefile=FALSE);
      plot(barPlot);
    dev.off();
  }

  positiveTargets = targetScanRef[which(targetScanRef[, 'miRNA'] %in% rownames(positiveRes)), ];
  positiveTargets[,1] = sub('\\.\\d+', '', positiveTargets[,1]);
  negativeTargets = targetScanRef[which(targetScanRef[, 'miRNA'] %in% rownames(negativeRes)), ];
  negativeTargets[,1] = sub('\\.\\d+', '', negativeTargets[,1]);


  write.table(positiveTargets, predictedPositiveTargetFile, quote=F, sep=',')
  write.table(negativeTargets, predictedNegativeTargetFile, quote=F, sep=',')
  uniquePosTargets = unique(positiveTargets[, 1])
  uniqueNegTargets = unique(negativeTargets[, 1])


#GOSEQ
  posGenes = as.integer(allTargets %in% uniquePosTargets)
  names(posGenes) = allTargets

  negGenes = as.integer(allTargets %in% uniqueNegTargets)
  names(negGenes) = allTargets

  totalGenes = as.integer(allTargets %in% unique(c(uniquePosTargets, uniqueNegTargets)));
  names(totalGenes) = allTargets

  #pwfPos=nullp(posGenes, genome, database, plot.fit=F)
  pwfPos=nullp(posGenes, bias.data=lengthData[which(names(lengthData) %in% allTargets)], plot.fit=F)
  pwfNeg=nullp(negGenes, bias.data=lengthData[which(names(lengthData) %in% allTargets)], plot.fit=F)
  #pwfAll = nullp(totalGenes, bias.data=lengthData[which(names(lengthData) %in% allTargets)], plot.fit=F)
  #pwfNeg=nullp(negGenes, genome, database, plot.fit=F)
  #pwfAll = nullp(totalGenes, genome, database, plot.fit=F)

  pos.GO.wall=goseq(pwfPos, gene2cat=GOMap, test.cat=c('GO:CC', 'GO:BP', 'GO:MF'))
  pos.kegg.wall=goseq(pwfPos, gene2cat=KEGGMap, test.cat=c('KEGG'))
  pos.kegg.wall = merge(pos.kegg.wall, KEGGpathToDesc, by.x="category",by.y="pathway_id",all.x=T)
  write.table(pos.GO.wall, posGOEnrichFile, col.names=T, row.names=F, quote=F, sep='\t')
  write.table(pos.kegg.wall, posKEGGEnrichFile, col.names=T, row.names=F, quote=F, sep='\t')

  neg.GO.wall=goseq(pwfNeg, gene2cat=GOMap, test.cat=c('GO:CC', 'GO:BP', 'GO:MF'))
  neg.kegg.wall=goseq(pwfNeg, gene2cat=KEGGMap, test.cat=c('KEGG'))
  neg.kegg.wall = merge(neg.kegg.wall, KEGGpathToDesc, by.x="category",by.y="pathway_id",all.x=T)

  write.table(neg.GO.wall, negGOEnrichFile, col.names=T, row.names=F, quote=F, sep='\t')
  write.table(neg.kegg.wall, negKEGGEnrichFile, col.names=T, row.names=F, quote=F, sep='\t')
}
